using Backend.Api.Data;
using Backend.Api.Data.Entities;
using Backend.Api.Data.Relations;
using Backend.Api.Extensions;
using Backend.Api.Models.Project;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Project;

public interface IProjectService
{
    Task<ProjectDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<ProjectDto?> CreateAsync(CreateProjectRequest request, string userId, bool isAdmin, CancellationToken cancellationToken = default);

    Task<ProjectDto?> UpdateAsync(int id, UpdateProjectRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> UpsertTagAsync(int projectId, int tagId, CancellationToken cancellationToken = default);

    Task<bool> DeleteTagAsync(int projectId, int tagId, CancellationToken cancellationToken = default);

    bool CanAccess(ProfileProject project, string? userId, bool isAdmin);
}

public class ProjectService(ApplicationDbContext db) : IProjectService
{
    public async Task<ProjectDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var project = await db.ProfileProjects
            .AsNoTracking()
            .Include(item => item.ProfileProjectTags)
            .ThenInclude(item => item.Tag)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return project is null ? null : Map(project);
    }

    public async Task<ProjectDto?> CreateAsync(
        CreateProjectRequest request,
        string userId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var candidateId = isAdmin ? request.CandidateId : userId;
        if (string.IsNullOrWhiteSpace(candidateId)
            || !await db.Users.AnyAsync(user => user.Id == candidateId, cancellationToken))
        {
            return null;
        }

        var project = new ProfileProject
        {
            CandidateId = candidateId,
            Name = request.Name,
            Description = request.Description,
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            CreatedAt = DateTime.UtcNow,
        };

        db.ProfileProjects.Add(project);
        await db.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(project.Id, cancellationToken);
    }

    public async Task<ProjectDto?> UpdateAsync(
        int id,
        UpdateProjectRequest request,
        CancellationToken cancellationToken = default)
    {
        var project = await db.ProfileProjects.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (project is null)
        {
            return null;
        }

        project.Name = request.Name;
        project.Description = request.Description;
        project.StartAt = request.StartAt;
        project.EndAt = request.EndAt;

        await db.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var project = await db.ProfileProjects.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (project is null)
        {
            return false;
        }

        db.ProfileProjects.Remove(project);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UpsertTagAsync(int projectId, int tagId, CancellationToken cancellationToken = default)
    {
        if (!await db.ProfileProjects.AnyAsync(project => project.Id == projectId, cancellationToken)
            || !await db.Tags.AnyAsync(tag => tag.Id == tagId, cancellationToken))
        {
            return false;
        }

        var exists = await db.ProfileProjectTags
            .AnyAsync(item => item.ProfileProjectId == projectId && item.TagId == tagId, cancellationToken);

        if (!exists)
        {
            db.ProfileProjectTags.Add(new ProfileProjectTag
            {
                ProfileProjectId = projectId,
                TagId = tagId,
            });
            await db.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    public async Task<bool> DeleteTagAsync(int projectId, int tagId, CancellationToken cancellationToken = default)
    {
        var relation = await db.ProfileProjectTags
            .FirstOrDefaultAsync(item => item.ProfileProjectId == projectId && item.TagId == tagId, cancellationToken);

        if (relation is null)
        {
            return false;
        }

        db.ProfileProjectTags.Remove(relation);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public bool CanAccess(ProfileProject project, string? userId, bool isAdmin) =>
        isAdmin || project.CandidateId == userId;

    private static ProjectDto Map(ProfileProject project) => new()
    {
        Id = project.Id,
        CandidateId = project.CandidateId,
        Name = project.Name,
        Description = project.Description,
        StartAt = project.StartAt,
        EndAt = project.EndAt,
        CreatedAt = project.CreatedAt,
        Tags = project.ProfileProjectTags
            .Select(tag => new ProjectTagDto { Id = tag.TagId, Name = tag.Tag.Name })
            .OrderBy(tag => tag.Name)
            .ToList(),
    };
}
