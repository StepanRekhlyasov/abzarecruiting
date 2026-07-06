using Backend.Api.Data;
using Backend.Api.Data.Entities;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Resume;
using Backend.Api.Services.Attributes;
using Backend.Api.Services.Position;
using Microsoft.EntityFrameworkCore;
using ResumeEntity = Backend.Api.Data.Entities.Resume;

namespace Backend.Api.Services.Resume;

public interface IResumeService
{
    Task<ResumeDto?> CreateAsync(int positionId, string candidateId, CancellationToken cancellationToken = default);

    Task<PagedResult<ResumeListItemDto>> GetListByPositionAsync(
        int positionId,
        PaginationParams pagination,
        CancellationToken cancellationToken = default);

    Task<ResumeDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<ResumeDto?> UpdateAsync(int id, UpdateResumeRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);

    bool CanView(ResumeEntity resume, string? userId, bool isAdmin, bool isRecruiter);

    bool CanModify(ResumeEntity resume, string? userId, bool isAdmin);
}

public class ResumeService(
    ApplicationDbContext db,
    IPositionRestrictionEvaluator restrictionEvaluator,
    IAttributeValueMapper valueMapper) : IResumeService
{
    public async Task<ResumeDto?> CreateAsync(int positionId, string candidateId, CancellationToken cancellationToken = default)
    {
        if (!await db.Positions.AnyAsync(position => position.Id == positionId, cancellationToken))
        {
            return null;
        }

        var resume = new ResumeEntity
        {
            CandidateId = candidateId,
            PositionId = positionId,
            Published = false,
            CreatedAt = DateTime.UtcNow,
        };

        db.Resumes.Add(resume);
        await db.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(resume.Id, cancellationToken);
    }

    public async Task<PagedResult<ResumeListItemDto>> GetListByPositionAsync(
        int positionId,
        PaginationParams pagination,
        CancellationToken cancellationToken = default)
    {
        var resumes = await db.Resumes
            .AsNoTracking()
            .Where(resume => resume.PositionId == positionId && resume.Published)
            .ToListAsync(cancellationToken);

        var filtered = new List<ResumeEntity>();
        foreach (var resume in resumes)
        {
            if (await restrictionEvaluator.CandidateMeetsAllRestrictionsAsync(resume.CandidateId, positionId, cancellationToken))
            {
                filtered.Add(resume);
            }
        }

        var ordered = await OrderByCandidateNameAsync(filtered, cancellationToken);
        var totalCount = ordered.Count;
        var pageItems = ordered.Skip(pagination.Skip).Take(pagination.NormalizedSize).ToList();
        var items = await MapListAsync(pageItems, cancellationToken);

        return new PagedResult<ResumeListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = pagination.NormalizedPage,
            Size = pagination.NormalizedSize,
        };
    }

    public async Task<ResumeDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var resume = await db.Resumes.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (resume is null)
        {
            return null;
        }

        var items = await MapListAsync([resume], cancellationToken);
        return items.FirstOrDefault();
    }

    public async Task<ResumeDto?> UpdateAsync(
        int id,
        UpdateResumeRequest request,
        CancellationToken cancellationToken = default)
    {
        var resume = await db.Resumes.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (resume is null)
        {
            return null;
        }

        resume.Published = request.Published;
        await db.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var resume = await db.Resumes.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (resume is null)
        {
            return false;
        }

        db.Resumes.Remove(resume);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public bool CanView(ResumeEntity resume, string? userId, bool isAdmin, bool isRecruiter) =>
        isAdmin || isRecruiter || resume.CandidateId == userId;

    public bool CanModify(ResumeEntity resume, string? userId, bool isAdmin) =>
        isAdmin || resume.CandidateId == userId;

    private async Task<List<ResumeEntity>> OrderByCandidateNameAsync(
        IReadOnlyList<ResumeEntity> resumes,
        CancellationToken cancellationToken)
    {
        if (resumes.Count == 0)
        {
            return [];
        }

        var candidateIds = resumes.Select(resume => resume.CandidateId).Distinct().ToList();
        var firstNameAttribute = await db.Attributes.AsNoTracking()
            .FirstOrDefaultAsync(attribute => attribute.Name == DefaultAttributes.FirstName, cancellationToken);
        var lastNameAttribute = await db.Attributes.AsNoTracking()
            .FirstOrDefaultAsync(attribute => attribute.Name == DefaultAttributes.LastName, cancellationToken);

        var profileAttributes = await db.ProfileAttributes
            .AsNoTracking()
            .Where(item => candidateIds.Contains(item.CandidateId))
            .ToListAsync(cancellationToken);

        string GetName(string candidateId, int? attributeId)
        {
            if (!attributeId.HasValue)
            {
                return string.Empty;
            }

            var profileAttribute = profileAttributes
                .FirstOrDefault(item => item.CandidateId == candidateId && item.AttributeId == attributeId.Value);

            return profileAttribute?.ValueString ?? string.Empty;
        }

        return resumes
            .OrderBy(resume => GetName(resume.CandidateId, firstNameAttribute?.Id))
            .ThenBy(resume => GetName(resume.CandidateId, lastNameAttribute?.Id))
            .ToList();
    }

    private async Task<IReadOnlyList<ResumeListItemDto>> MapListAsync(
        IReadOnlyList<ResumeEntity> resumes,
        CancellationToken cancellationToken)
    {
        if (resumes.Count == 0)
        {
            return [];
        }

        var defaultAttributeNames = DefaultAttributes.All.Select(item => item.Name).ToList();
        var defaultAttributes = await db.Attributes
            .AsNoTracking()
            .Where(attribute => defaultAttributeNames.Contains(attribute.Name))
            .ToListAsync(cancellationToken);

        var candidateIds = resumes.Select(resume => resume.CandidateId).Distinct().ToList();
        var profileAttributes = await db.ProfileAttributes
            .AsNoTracking()
            .Where(item => candidateIds.Contains(item.CandidateId))
            .ToListAsync(cancellationToken);

        return resumes.Select(resume => new ResumeListItemDto
        {
            Id = resume.Id,
            CandidateId = resume.CandidateId,
            PositionId = resume.PositionId,
            Published = resume.Published,
            CreatedAt = resume.CreatedAt,
            CandidateAttributes = defaultAttributes.Select(attribute =>
            {
                var profileAttribute = profileAttributes
                    .FirstOrDefault(item => item.CandidateId == resume.CandidateId && item.AttributeId == attribute.Id);

                return new ResumeCandidateAttributeDto
                {
                    Name = attribute.Name,
                    Value = profileAttribute is null ? null : valueMapper.GetComparableValue(profileAttribute, attribute),
                };
            }).ToList(),
        }).ToList();
    }
}
