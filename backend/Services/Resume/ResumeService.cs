using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Models.Common;
using Backend.Api.Models.Resume;
using Backend.Api.Services.Attributes;
using Backend.Api.Services.Position;
using Microsoft.EntityFrameworkCore;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
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

    Task<ResumeGetResult> GetByIdForViewerAsync(
        int id,
        string? userId,
        bool isAdmin,
        bool isRecruiter,
        CancellationToken cancellationToken = default);

    Task<ResumeDto?> UpdateAsync(int id, UpdateResumeRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default);

    bool CanView(ResumeEntity resume, string? userId, bool isAdmin, bool isRecruiter);

    bool CanModify(ResumeEntity resume, string? userId, bool isAdmin);
}

public class ResumeService(
    ApplicationDbContext db,
    IPositionRestrictionEvaluator restrictionEvaluator,
    IAttributeValueMapper valueMapper) : IResumeService
{
    private const string VersionChangedMessage = "error.oldVersion";
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

        if (resumes.Count == 0)
        {
            return new PagedResult<ResumeListItemDto>
            {
                Items = [],
                TotalCount = 0,
                Page = pagination.NormalizedPage,
                Size = pagination.NormalizedSize,
            };
        }

        var restrictions = await restrictionEvaluator.GetRestrictionsForPositionAsync(positionId, cancellationToken);
        var candidateIds = resumes.Select(resume => resume.CandidateId).Distinct().ToList();
        var defaultAttributes = await LoadDefaultAttributesAsync(cancellationToken);

        IReadOnlyList<ProfileAttribute> profileAttributes;
        IReadOnlyList<ResumeEntity> filtered;

        if (restrictions.Count == 0)
        {
            profileAttributes = await LoadProfileAttributesAsync(candidateIds, cancellationToken);
            filtered = resumes;
        }
        else
        {
            var contexts = await restrictionEvaluator.LoadCandidateContextsAsync(candidateIds, cancellationToken);
            filtered = restrictionEvaluator.FilterByRestrictions(
                restrictions,
                resumes,
                resume => resume.CandidateId,
                contexts);
            profileAttributes = candidateIds
                .SelectMany(candidateId => contexts[candidateId].ProfileAttributes)
                .ToList();
        }

        var ordered = OrderByCandidateName(filtered, defaultAttributes, profileAttributes);
        var totalCount = ordered.Count;
        var pageItems = ordered.Skip(pagination.Skip).Take(pagination.NormalizedSize).ToList();
        var items = MapList(pageItems, defaultAttributes, profileAttributes);

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

        return await MapSingleAsync(resume, cancellationToken);
    }

    public async Task<ResumeGetResult> GetByIdForViewerAsync(
        int id,
        string? userId,
        bool isAdmin,
        bool isRecruiter,
        CancellationToken cancellationToken = default)
    {
        var resume = await db.Resumes.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (resume is null)
        {
            return ResumeGetResult.NotFoundResult();
        }

        if (!CanView(resume, userId, isAdmin, isRecruiter))
        {
            return ResumeGetResult.ForbiddenResult();
        }

        var dto = await MapSingleAsync(resume, cancellationToken);
        return dto is null ? ResumeGetResult.NotFoundResult() : ResumeGetResult.Ok(dto);
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

        if (resume.Version != request.Version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }

        resume.Published = request.Published;
        resume.Version++;
        await db.SaveChangesAsync(cancellationToken);
        return await MapSingleAsync(resume, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default)
    {
        var resume = await db.Resumes.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (resume is null)
        {
            return false;
        }

        if (resume.Version != version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }

        db.Resumes.Remove(resume);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public bool CanView(ResumeEntity resume, string? userId, bool isAdmin, bool isRecruiter) =>
        isAdmin || isRecruiter || resume.CandidateId == userId;

    public bool CanModify(ResumeEntity resume, string? userId, bool isAdmin) =>
        isAdmin || resume.CandidateId == userId;

    private async Task<ResumeDto?> MapSingleAsync(ResumeEntity resume, CancellationToken cancellationToken)
    {
        var defaultAttributes = await LoadDefaultAttributesAsync(cancellationToken);
        var profileAttributes = await LoadProfileAttributesAsync([resume.CandidateId], cancellationToken);
        return MapList([resume], defaultAttributes, profileAttributes).FirstOrDefault();
    }

    private Task<List<AttributeEntity>> LoadDefaultAttributesAsync(CancellationToken cancellationToken)
    {
        var defaultAttributeNames = DefaultAttributes.All.Select(item => item.Name).ToList();
        return db.Attributes
            .AsNoTracking()
            .Where(attribute => defaultAttributeNames.Contains(attribute.Name))
            .ToListAsync(cancellationToken);
    }

    private Task<List<ProfileAttribute>> LoadProfileAttributesAsync(
        IReadOnlyList<string> candidateIds,
        CancellationToken cancellationToken) =>
        db.ProfileAttributes
            .AsNoTracking()
            .Include(profileAttribute => profileAttribute.Attribute)
            .Where(profileAttribute => candidateIds.Contains(profileAttribute.CandidateId))
            .ToListAsync(cancellationToken);

    private static List<ResumeEntity> OrderByCandidateName(
        IReadOnlyList<ResumeEntity> resumes,
        IReadOnlyList<AttributeEntity> defaultAttributes,
        IReadOnlyList<ProfileAttribute> profileAttributes)
    {
        if (resumes.Count == 0)
        {
            return [];
        }

        var firstNameId = defaultAttributes
            .FirstOrDefault(attribute => attribute.Name == DefaultAttributes.FirstName)?.Id;
        var lastNameId = defaultAttributes
            .FirstOrDefault(attribute => attribute.Name == DefaultAttributes.LastName)?.Id;

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
            .OrderBy(resume => GetName(resume.CandidateId, firstNameId))
            .ThenBy(resume => GetName(resume.CandidateId, lastNameId))
            .ToList();
    }

    private IReadOnlyList<ResumeListItemDto> MapList(
        IReadOnlyList<ResumeEntity> resumes,
        IReadOnlyList<AttributeEntity> defaultAttributes,
        IReadOnlyList<ProfileAttribute> profileAttributes) =>
        [.. resumes.Select(resume => new ResumeListItemDto
        {
            Id = resume.Id,
            CandidateId = resume.CandidateId,
            PositionId = resume.PositionId,
            Published = resume.Published,
            CreatedAt = resume.CreatedAt,
            Version = resume.Version,
            CandidateAttributes =
            [
                .. defaultAttributes.Select(attribute =>
                {
                    var profileAttribute = profileAttributes
                        .FirstOrDefault(item =>
                            item.CandidateId == resume.CandidateId && item.AttributeId == attribute.Id);

                    return new ResumeCandidateAttributeDto
                    {
                        Name = attribute.Name,
                        Value = profileAttribute is null
                            ? null
                            : valueMapper.GetComparableValue(profileAttribute, attribute),
                    };
                }),
            ],
        })];
}
