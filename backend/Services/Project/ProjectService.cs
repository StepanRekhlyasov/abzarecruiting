using System.Linq.Expressions;
using Backend.Api.Data;
using Backend.Api.Data.Entities;
using Backend.Api.Data.Relations;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Project;
using Backend.Api.Services.Search;
using Backend.Api.Services.User;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Project;

public interface IProjectService
{
    Task<PagedResult<ProjectDto>> GetListForViewerAsync(
        PaginationParams pagination,
        string userId,
        bool isAdmin,
        string? candidateIdFilter = null,
        bool isRecruiter = false,
        IEnumerable<int>? tagIds = null,
        IEnumerable<string>? candidateIds = null,
        CancellationToken cancellationToken = default);

    Task<ProjectDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<ProjectDto?> CreateAsync(CreateProjectRequest request, string userId, bool isAdmin, CancellationToken cancellationToken = default);

    Task<ProjectDto?> UpdateAsync(int id, UpdateProjectRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);

    Task DeleteBatchAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default);

    Task<bool> UpsertTagAsync(int projectId, int tagId, CancellationToken cancellationToken = default);

    Task<bool> DeleteTagAsync(int projectId, int tagId, CancellationToken cancellationToken = default);

    Task<bool> SyncTagsAsync(int projectId, IEnumerable<int> tagIds, CancellationToken cancellationToken = default);

    bool CanAccess(ProfileProject project, string? userId, bool isAdmin, bool isRecruiter = false);

    bool CanModify(ProfileProject project, string? userId, bool isAdmin);
}

public class ProjectService(
    ApplicationDbContext db,
    ISearchIndexService searchIndex,
    ILuceneIndex lucene,
    IUserNameService userNameService) : IProjectService
{
    public async Task<PagedResult<ProjectDto>> GetListForViewerAsync(
        PaginationParams pagination,
        string userId,
        bool isAdmin,
        string? candidateIdFilter = null,
        bool isRecruiter = false,
        IEnumerable<int>? tagIds = null,
        IEnumerable<string>? candidateIds = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.ProfileProjects
            .AsNoTracking()
            .Include(item => item.ProfileProjectTags)
            .ThenInclude(item => item.Tag)
            .AsQueryable();

        var candidateIdFilters = (candidateIds ?? [])
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (!string.IsNullOrWhiteSpace(candidateIdFilter)
            && !candidateIdFilters.Contains(candidateIdFilter, StringComparer.Ordinal))
        {
            candidateIdFilters.Add(candidateIdFilter.Trim());
        }

        if (isAdmin)
        {
            if (candidateIdFilters.Count == 1)
            {
                var candidateId = candidateIdFilters[0];
                query = query.Where(project => project.CandidateId == candidateId);
            }
            else if (candidateIdFilters.Count > 1)
            {
                query = query.Where(BuildCandidateIdEqualsAny(candidateIdFilters));
            }
        }
        else if (isRecruiter)
        {
            if (candidateIdFilters.Count == 0)
            {
                return new PagedResult<ProjectDto>
                {
                    Items = [],
                    TotalCount = 0,
                    Page = pagination.NormalizedPage,
                    Size = pagination.NormalizedSize,
                };
            }

            if (candidateIdFilters.Count == 1)
            {
                var candidateId = candidateIdFilters[0];
                query = query.Where(project => project.CandidateId == candidateId);
            }
            else
            {
                query = query.Where(BuildCandidateIdEqualsAny(candidateIdFilters));
            }
        }
        else
        {
            query = query.Where(project => project.CandidateId == userId);
        }

        var filterTagIds = (tagIds ?? [])
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        query = query.WhereHasAllTagIds(
            filterTagIds,
            tagId => project => project.ProfileProjectTags.Any(item => item.TagId == tagId));

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            query = query.WhereMatches(
                lucene,
                SearchEntityTypes.Project,
                pagination.Search,
                project => project.Id);
        }

        query = query.ApplySort(pagination, project => project.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedSize)
            .ToListAsync(cancellationToken);

        var nameMap = await userNameService.GetFullNameMapAsync(
            items.Select(item => item.CandidateId).Distinct().ToList(),
            cancellationToken);

        return items
            .Select(item => Map(item, nameMap.GetValueOrDefault(item.CandidateId)))
            .ToList()
            .ToPagedResult(totalCount, pagination);
    }

    private static Expression<Func<ProfileProject, bool>> BuildCandidateIdEqualsAny(IReadOnlyList<string> ids)
    {
        var parameter = Expression.Parameter(typeof(ProfileProject), "project");
        var property = Expression.Property(parameter, nameof(ProfileProject.CandidateId));

        Expression? body = null;
        foreach (var id in ids)
        {
            var equals = Expression.Equal(property, Expression.Constant(id, typeof(string)));
            body = body is null ? equals : Expression.OrElse(body, equals);
        }

        return Expression.Lambda<Func<ProfileProject, bool>>(body!, parameter);
    }

    public async Task<ProjectDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var project = await db.ProfileProjects
            .AsNoTracking()
            .Include(item => item.ProfileProjectTags)
            .ThenInclude(item => item.Tag)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (project is null)
        {
            return null;
        }

        var nameMap = await userNameService.GetFullNameMapAsync([project.CandidateId], cancellationToken);
        return Map(project, nameMap.GetValueOrDefault(project.CandidateId));
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
        await searchIndex.RebuildProjectAsync(project.Id, cancellationToken);
        await searchIndex.RebuildResumesForCandidateAsync(candidateId, cancellationToken);
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
        await searchIndex.RebuildProjectAsync(id, cancellationToken);
        await searchIndex.RebuildResumesForCandidateAsync(project.CandidateId, cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var project = await db.ProfileProjects.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (project is null)
        {
            return false;
        }

        var candidateId = project.CandidateId;
        db.ProfileProjects.Remove(project);
        await db.SaveChangesAsync(cancellationToken);
        searchIndex.DeleteProjects([id]);
        await searchIndex.RebuildResumesForCandidateAsync(candidateId, cancellationToken);
        return true;
    }

    public async Task DeleteBatchAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default)
    {
        var uniqueIds = ids.Where(id => id > 0).Distinct().ToList();
        if (uniqueIds.Count == 0)
        {
            return;
        }

        var projects = await db.ProfileProjects
            .Where(item => uniqueIds.Contains(item.Id))
            .ToListAsync(cancellationToken);

        if (projects.Count != uniqueIds.Count)
        {
            throw new InvalidOperationException("error.projects.notFound");
        }

        var candidateIds = projects.Select(item => item.CandidateId).Distinct().ToList();
        db.ProfileProjects.RemoveRange(projects);
        await db.SaveChangesAsync(cancellationToken);
        searchIndex.DeleteProjects(uniqueIds);
        await searchIndex.RebuildResumesForCandidatesAsync(candidateIds, cancellationToken);
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
            await searchIndex.RebuildProjectAsync(projectId, cancellationToken);
            var candidateId = await db.ProfileProjects.AsNoTracking()
                .Where(project => project.Id == projectId)
                .Select(project => project.CandidateId)
                .FirstAsync(cancellationToken);
            await searchIndex.RebuildResumesForCandidateAsync(candidateId, cancellationToken);
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
        await searchIndex.RebuildProjectAsync(projectId, cancellationToken);
        var candidateId = await db.ProfileProjects.AsNoTracking()
            .Where(project => project.Id == projectId)
            .Select(project => project.CandidateId)
            .FirstAsync(cancellationToken);
        await searchIndex.RebuildResumesForCandidateAsync(candidateId, cancellationToken);
        return true;
    }

    public async Task<bool> SyncTagsAsync(
        int projectId,
        IEnumerable<int> tagIds,
        CancellationToken cancellationToken = default)
    {
        if (!await db.ProfileProjects.AnyAsync(project => project.Id == projectId, cancellationToken))
        {
            return false;
        }

        var desiredTags = tagIds.Where(id => id > 0).Distinct().ToHashSet();
        if (desiredTags.Count > 0)
        {
            var existingTagCount = await db.Tags
                .CountAsync(tag => desiredTags.Contains(tag.Id), cancellationToken);
            if (existingTagCount != desiredTags.Count)
            {
                throw new InvalidOperationException("error.tags.notFound");
            }
        }

        var currentTags = await db.ProfileProjectTags
            .Where(item => item.ProfileProjectId == projectId)
            .ToListAsync(cancellationToken);

        var toRemove = currentTags.Where(item => !desiredTags.Contains(item.TagId)).ToList();
        if (toRemove.Count > 0)
        {
            db.ProfileProjectTags.RemoveRange(toRemove);
        }

        var existingTagIds = currentTags.Select(item => item.TagId).ToHashSet();
        foreach (var tagId in desiredTags.Where(id => !existingTagIds.Contains(id)))
        {
            db.ProfileProjectTags.Add(new ProfileProjectTag
            {
                ProfileProjectId = projectId,
                TagId = tagId,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        await searchIndex.RebuildProjectAsync(projectId, cancellationToken);
        var candidateId = await db.ProfileProjects.AsNoTracking()
            .Where(project => project.Id == projectId)
            .Select(project => project.CandidateId)
            .FirstAsync(cancellationToken);
        await searchIndex.RebuildResumesForCandidateAsync(candidateId, cancellationToken);
        return true;
    }

    public bool CanAccess(ProfileProject project, string? userId, bool isAdmin, bool isRecruiter = false) =>
        OwnershipExtensions.CanAccessOwner(project.CandidateId, userId, isAdmin, isRecruiter);

    public bool CanModify(ProfileProject project, string? userId, bool isAdmin) =>
        OwnershipExtensions.CanModifyOwner(project.CandidateId, userId, isAdmin);

    private static ProjectDto Map(ProfileProject project, string? candidateName = null) => new()
    {
        Id = project.Id,
        CandidateId = project.CandidateId,
        CandidateName = candidateName ?? string.Empty,
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
