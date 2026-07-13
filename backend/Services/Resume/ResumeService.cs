using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Models.Common;
using Backend.Api.Models.Resume;
using Backend.Api.Services.Attributes;
using Backend.Api.Services.Files;
using Backend.Api.Services.Position;
using Backend.Api.Services.Profile;
using Microsoft.EntityFrameworkCore;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using FileEntity = Backend.Api.Data.Entities.File;
using ResumeEntity = Backend.Api.Data.Entities.Resume;

namespace Backend.Api.Services.Resume;

public interface IResumeService
{
    Task<ResumeDto?> CreateAsync(int positionId, string candidateId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<int>> GetPositionIdsForCandidateAsync(
        string candidateId,
        CancellationToken cancellationToken = default);

    Task<PagedResult<ResumeListItemDto>> GetListForViewerAsync(
        PaginationParams pagination,
        string userId,
        bool isAdmin,
        bool isRecruiter,
        CancellationToken cancellationToken = default);

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
    IAttributeValueMapper valueMapper,
    IProfileService profileService) : IResumeService
{
    private const string VersionChangedMessage = "error.oldVersion";
    private const string AlreadyExistsMessage = "error.resumes.alreadyExists";

    public async Task<ResumeDto?> CreateAsync(int positionId, string candidateId, CancellationToken cancellationToken = default)
    {
        if (!await db.Positions.AnyAsync(position => position.Id == positionId, cancellationToken))
        {
            return null;
        }

        var alreadyExists = await db.Resumes.AnyAsync(
            resume => resume.CandidateId == candidateId && resume.PositionId == positionId,
            cancellationToken);

        if (alreadyExists)
        {
            throw new InvalidOperationException(AlreadyExistsMessage);
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

        var positionAttributeIds = await db.PositionAttributes
            .AsNoTracking()
            .Where(item => item.PositionId == positionId)
            .Select(item => item.AttributeId)
            .ToListAsync(cancellationToken);

        if (positionAttributeIds.Count > 0)
        {
            await profileService.AddAttributesAsync(candidateId, positionAttributeIds, cancellationToken);
        }

        return await GetByIdAsync(resume.Id, cancellationToken);
    }

    public async Task<IReadOnlyList<int>> GetPositionIdsForCandidateAsync(
        string candidateId,
        CancellationToken cancellationToken = default) =>
        await db.Resumes
            .AsNoTracking()
            .Where(resume => resume.CandidateId == candidateId)
            .Select(resume => resume.PositionId)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<PagedResult<ResumeListItemDto>> GetListForViewerAsync(
        PaginationParams pagination,
        string userId,
        bool isAdmin,
        bool isRecruiter,
        CancellationToken cancellationToken = default)
    {
        var query = db.Resumes
            .AsNoTracking()
            .Include(resume => resume.Position)
            .AsQueryable();

        if (isAdmin)
        {
            // Admin sees all resumes.
        }
        else if (isRecruiter)
        {
            query = query.Where(resume => resume.Published);
        }
        else
        {
            query = query.Where(resume => resume.CandidateId == userId);
        }

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(resume =>
                resume.Position.Name.Contains(search)
                || resume.CandidateId.Contains(search));
        }

        query = pagination.NormalizedSortBy switch
        {
            "id" => pagination.IsDescending
                ? query.OrderByDescending(resume => resume.Id)
                : query.OrderBy(resume => resume.Id),
            "positionname" or "position" => pagination.IsDescending
                ? query.OrderByDescending(resume => resume.Position.Name)
                : query.OrderBy(resume => resume.Position.Name),
            "published" => pagination.IsDescending
                ? query.OrderByDescending(resume => resume.Published)
                : query.OrderBy(resume => resume.Published),
            "createdat" => pagination.IsDescending
                ? query.OrderByDescending(resume => resume.CreatedAt)
                : query.OrderBy(resume => resume.CreatedAt),
            _ => pagination.IsDescending
                ? query.OrderByDescending(resume => resume.CreatedAt)
                : query.OrderBy(resume => resume.CreatedAt),
        };

        var totalCount = await query.CountAsync(cancellationToken);
        var pageItems = await query
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedSize)
            .ToListAsync(cancellationToken);

        if (pageItems.Count == 0)
        {
            return new PagedResult<ResumeListItemDto>
            {
                Items = [],
                TotalCount = totalCount,
                Page = pagination.NormalizedPage,
                Size = pagination.NormalizedSize,
            };
        }

        var defaultAttributes = await LoadDefaultAttributesAsync(cancellationToken);
        var candidateIds = pageItems.Select(resume => resume.CandidateId).Distinct().ToList();
        var profileAttributes = await LoadProfileAttributesAsync(candidateIds, cancellationToken);
        var files = await LoadFilesForAttributesAsync(defaultAttributes, profileAttributes, cancellationToken);
        var items = MapList(pageItems, defaultAttributes, profileAttributes, files);

        return new PagedResult<ResumeListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = pagination.NormalizedPage,
            Size = pagination.NormalizedSize,
        };
    }

    public async Task<PagedResult<ResumeListItemDto>> GetListByPositionAsync(
        int positionId,
        PaginationParams pagination,
        CancellationToken cancellationToken = default)
    {
        var resumes = await db.Resumes
            .AsNoTracking()
            .Include(resume => resume.Position)
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

        var ordered = pagination.NormalizedSortBy switch
        {
            "id" => pagination.IsDescending
                ? filtered.OrderByDescending(resume => resume.Id).ToList()
                : filtered.OrderBy(resume => resume.Id).ToList(),
            "createdat" => pagination.IsDescending
                ? filtered.OrderByDescending(resume => resume.CreatedAt).ToList()
                : filtered.OrderBy(resume => resume.CreatedAt).ToList(),
            "published" => pagination.IsDescending
                ? filtered.OrderByDescending(resume => resume.Published).ToList()
                : filtered.OrderBy(resume => resume.Published).ToList(),
            "lastname" => OrderByCandidateName(filtered, defaultAttributes, profileAttributes, lastNameFirst: true, descending: pagination.IsDescending),
            _ => OrderByCandidateName(filtered, defaultAttributes, profileAttributes, lastNameFirst: false, descending: pagination.IsDescending),
        };
        var totalCount = ordered.Count;
        var pageItems = ordered.Skip(pagination.Skip).Take(pagination.NormalizedSize).ToList();
        var files = await LoadFilesForAttributesAsync(defaultAttributes, profileAttributes, cancellationToken);
        var items = MapList(pageItems, defaultAttributes, profileAttributes, files);

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
        var resume = await db.Resumes
            .AsNoTracking()
            .Include(item => item.Position)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
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
        var resume = await db.Resumes
            .AsNoTracking()
            .Include(item => item.Position)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
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
        return await GetByIdAsync(id, cancellationToken);
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
        isAdmin
        || (isRecruiter && resume.Published)
        || resume.CandidateId == userId;

    public bool CanModify(ResumeEntity resume, string? userId, bool isAdmin) =>
        isAdmin || resume.CandidateId == userId;

    private async Task<ResumeDto?> MapSingleAsync(ResumeEntity resume, CancellationToken cancellationToken)
    {
        var defaultAttributes = await LoadDefaultAttributesAsync(cancellationToken);
        var profileAttributes = await LoadProfileAttributesAsync([resume.CandidateId], cancellationToken);
        var files = await LoadFilesForAttributesAsync(defaultAttributes, profileAttributes, cancellationToken);
        return MapList([resume], defaultAttributes, profileAttributes, files).FirstOrDefault();
    }

    private async Task<IReadOnlyDictionary<Guid, FileEntity>> LoadFilesForAttributesAsync(
        IReadOnlyList<AttributeEntity> attributes,
        IReadOnlyList<ProfileAttribute> profileAttributes,
        CancellationToken cancellationToken)
    {
        var storedValues = attributes
            .Where(attribute => FileAttributeValueResolver.IsFileValueType(attribute.ValueType))
            .SelectMany(attribute => profileAttributes
                .Where(item => item.AttributeId == attribute.Id)
                .Select(item => valueMapper.GetComparableValue(item, attribute)));

        return await FileAttributeValueResolver.LoadFilesAsync(db, storedValues, cancellationToken);
    }

    private Task<List<AttributeEntity>> LoadDefaultAttributesAsync(CancellationToken cancellationToken) =>
        db.Attributes
            .AsNoTracking()
            .Where(attribute =>
                attribute.Name == DefaultAttributes.FirstName
                || attribute.Name == DefaultAttributes.LastName
                || attribute.Name == DefaultAttributes.Email
                || attribute.Name == DefaultAttributes.Phone
                || attribute.Name == DefaultAttributes.Bio
                || attribute.Name == DefaultAttributes.Location
                || attribute.Name == DefaultAttributes.Photo)
            .ToListAsync(cancellationToken);

    private async Task<List<ProfileAttribute>> LoadProfileAttributesAsync(
        IReadOnlyList<string> candidateIds,
        CancellationToken cancellationToken)
    {
        var ids = candidateIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        if (ids.Count == 1)
        {
            var candidateId = ids[0];
            return await db.ProfileAttributes
                .AsNoTracking()
                .Include(profileAttribute => profileAttribute.Attribute)
                .Where(profileAttribute => profileAttribute.CandidateId == candidateId)
                .ToListAsync(cancellationToken);
        }

        // MySQL EF provider fails to map parameterized string collections in Contains().
        return await db.ProfileAttributes
            .AsNoTracking()
            .Include(profileAttribute => profileAttribute.Attribute)
            .Where(profileAttribute => EF.Constant(ids).Contains(profileAttribute.CandidateId))
            .ToListAsync(cancellationToken);
    }

    private static List<ResumeEntity> OrderByCandidateName(
        IReadOnlyList<ResumeEntity> resumes,
        IReadOnlyList<AttributeEntity> defaultAttributes,
        IReadOnlyList<ProfileAttribute> profileAttributes,
        bool lastNameFirst = false,
        bool descending = false)
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

        IOrderedEnumerable<ResumeEntity> ordered = lastNameFirst
            ? resumes.OrderBy(resume => GetName(resume.CandidateId, lastNameId))
                .ThenBy(resume => GetName(resume.CandidateId, firstNameId))
            : resumes.OrderBy(resume => GetName(resume.CandidateId, firstNameId))
                .ThenBy(resume => GetName(resume.CandidateId, lastNameId));

        if (descending)
        {
            ordered = lastNameFirst
                ? resumes.OrderByDescending(resume => GetName(resume.CandidateId, lastNameId))
                    .ThenByDescending(resume => GetName(resume.CandidateId, firstNameId))
                : resumes.OrderByDescending(resume => GetName(resume.CandidateId, firstNameId))
                    .ThenByDescending(resume => GetName(resume.CandidateId, lastNameId));
        }

        return ordered.ToList();
    }

    private IReadOnlyList<ResumeListItemDto> MapList(
        IReadOnlyList<ResumeEntity> resumes,
        IReadOnlyList<AttributeEntity> defaultAttributes,
        IReadOnlyList<ProfileAttribute> profileAttributes,
        IReadOnlyDictionary<Guid, FileEntity> files) =>
        [.. resumes.Select(resume => new ResumeListItemDto
        {
            Id = resume.Id,
            CandidateId = resume.CandidateId,
            PositionId = resume.PositionId,
            PositionName = resume.Position?.Name ?? string.Empty,
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

                    var storedValue = profileAttribute is null
                        ? null
                        : valueMapper.GetComparableValue(profileAttribute, attribute);

                    return new ResumeCandidateAttributeDto
                    {
                        Name = attribute.Name,
                        Value = FileAttributeValueResolver.ToDisplayValue(attribute.ValueType, storedValue, files),
                    };
                }),
            ],
        })];
}
