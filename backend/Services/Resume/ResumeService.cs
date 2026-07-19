using System.Linq.Expressions;
using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Models.Common;
using Backend.Api.Models.Files;
using Backend.Api.Models.Profile;
using Backend.Api.Models.Project;
using Backend.Api.Models.Resume;
using Backend.Api.Services.Attributes;
using Backend.Api.Services.Files;
using Backend.Api.Services.Position;
using Backend.Api.Services.Profile;
using Backend.Api.Services.Search;
using Microsoft.EntityFrameworkCore;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using FileEntity = Backend.Api.Data.Entities.File;
using ProfileProjectEntity = Backend.Api.Data.Entities.ProfileProject;
using ResumeEntity = Backend.Api.Data.Entities.Resume;

namespace Backend.Api.Services.Resume;

public interface IResumeService
{
    Task<ResumeDto?> CreateAsync(int positionId, string candidateId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ResumeDto>> CreateBatchAsync(
        IEnumerable<int> positionIds,
        string candidateId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<int>> GetPositionIdsForCandidateAsync(
        string candidateId,
        CancellationToken cancellationToken = default);

    Task<PagedResult<ResumeListItemDto>> GetListForViewerAsync(
        PaginationParams pagination,
        string userId,
        bool isAdmin,
        bool isRecruiter,
        string? candidateIdFilter = null,
        CancellationToken cancellationToken = default);

    Task<PagedResult<ResumeListItemDto>> GetListByPositionAsync(
        int positionId,
        PaginationParams pagination,
        string? viewerUserId = null,
        bool isAdmin = false,
        CancellationToken cancellationToken = default);

    Task<ResumeDto?> GetByIdAsync(
        int id,
        string? viewerUserId = null,
        CancellationToken cancellationToken = default);

    Task<ResumeGetResult> GetByIdForViewerAsync(
        int id,
        string? userId,
        bool isAdmin,
        bool isRecruiter,
        CancellationToken cancellationToken = default);

    Task<ResumeDto?> UpdateAsync(int id, UpdateResumeRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default);

    Task DeleteBatchAsync(IEnumerable<DeleteResumeItem> items, CancellationToken cancellationToken = default);

    Task<ResumeLikeStateDto?> ToggleLikeAsync(
        int resumeId,
        string userId,
        CancellationToken cancellationToken = default);

    Task<ResumePdfResult> GeneratePdfForViewerAsync(
        int id,
        string? userId,
        bool isAdmin,
        bool isRecruiter,
        string? locale = null,
        CancellationToken cancellationToken = default);

    bool CanView(ResumeEntity resume, string? userId, bool isAdmin, bool isRecruiter);

    bool CanModify(ResumeEntity resume, string? userId, bool isAdmin);
}

public class ResumeService(
    ApplicationDbContext db,
    IPositionRestrictionEvaluator restrictionEvaluator,
    IAttributeValueMapper valueMapper,
    IProfileService profileService,
    ISearchIndexService searchIndex,
    ILuceneIndex lucene,
    IHttpClientFactory httpClientFactory) : IResumeService
{
    private const string VersionChangedMessage = "error.oldVersion";
    private const string AlreadyExistsMessage = "error.resumes.alreadyExists";
    private const string IncompleteAttributesMessage = "error.resumes.incompleteAttributes";

    public async Task<ResumeDto?> CreateAsync(int positionId, string candidateId, CancellationToken cancellationToken = default)
    {
        if (!await db.Positions.AnyAsync(position => position.Id == positionId, cancellationToken))
        {
            return null;
        }

        var isCandidate = await (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where userRole.UserId == candidateId && role.Name == Roles.Candidate
            select role.Id
        ).AnyAsync(cancellationToken);

        if (!isCandidate)
        {
            throw new InvalidOperationException("error.profile.notCandidate");
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

        await searchIndex.RebuildResumeAsync(resume.Id, cancellationToken);

        return await GetByIdAsync(resume.Id, cancellationToken: cancellationToken);
    }

    public async Task<IReadOnlyList<ResumeDto>> CreateBatchAsync(
        IEnumerable<int> positionIds,
        string candidateId,
        CancellationToken cancellationToken = default)
    {
        var uniqueIds = positionIds.Where(id => id > 0).Distinct().ToList();
        if (uniqueIds.Count == 0)
        {
            return [];
        }

        var isCandidate = await (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where userRole.UserId == candidateId && role.Name == Roles.Candidate
            select role.Id
        ).AnyAsync(cancellationToken);

        if (!isCandidate)
        {
            throw new InvalidOperationException("error.profile.notCandidate");
        }

        var existingPositionIds = await db.Positions
            .AsNoTracking()
            .Where(position => uniqueIds.Contains(position.Id))
            .Select(position => position.Id)
            .ToListAsync(cancellationToken);

        var toCreate = uniqueIds.Where(existingPositionIds.Contains).ToList();
        if (toCreate.Count == 0)
        {
            return [];
        }

        var alreadyExists = await db.Resumes
            .AsNoTracking()
            .AnyAsync(
                resume => resume.CandidateId == candidateId && toCreate.Contains(resume.PositionId),
                cancellationToken);

        if (alreadyExists)
        {
            throw new InvalidOperationException(AlreadyExistsMessage);
        }

        var now = DateTime.UtcNow;
        var resumes = toCreate
            .Select(positionId => new ResumeEntity
            {
                CandidateId = candidateId,
                PositionId = positionId,
                Published = false,
                CreatedAt = now,
            })
            .ToList();

        db.Resumes.AddRange(resumes);
        await db.SaveChangesAsync(cancellationToken);

        var positionAttributeIds = await db.PositionAttributes
            .AsNoTracking()
            .Where(item => toCreate.Contains(item.PositionId))
            .Select(item => item.AttributeId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (positionAttributeIds.Count > 0)
        {
            await profileService.AddAttributesAsync(candidateId, positionAttributeIds, cancellationToken);
        }

        await searchIndex.RebuildResumesAsync(resumes.Select(item => item.Id), cancellationToken);

        var createdIds = resumes.Select(resume => resume.Id).ToList();
        var loaded = await db.Resumes
            .AsNoTracking()
            .Include(item => item.Position)
            .Where(item => createdIds.Contains(item.Id))
            .ToListAsync(cancellationToken);

        return await MapManyAsync(loaded, viewerUserId: null, cancellationToken);
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
        string? candidateIdFilter = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.Resumes
            .AsNoTracking()
            .Include(resume => resume.Position)
            .AsQueryable();

        if (isAdmin)
        {
            if (!string.IsNullOrWhiteSpace(candidateIdFilter))
            {
                query = query.Where(resume => resume.CandidateId == candidateIdFilter);
            }
        }
        else if (isRecruiter)
        {
            query = query.Where(resume => resume.Published);
            if (!string.IsNullOrWhiteSpace(candidateIdFilter))
            {
                query = query.Where(resume => resume.CandidateId == candidateIdFilter);
            }
        }
        else
        {
            query = query.Where(resume => resume.CandidateId == userId);
        }

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            query = query.WhereMatches(
                lucene,
                SearchEntityTypes.Resume,
                pagination.Search,
                resume => resume.Id);
        }

        var defaultAttributes = await LoadDefaultAttributesAsync(cancellationToken);
        List<ResumeEntity> pageItems;
        int totalCount;
        IReadOnlyList<ProfileAttribute> profileAttributes;

        if (!isAdmin)
        {
            var allItems = await query.ToListAsync(cancellationToken);
            var filtered = await FilterResumesMeetingPositionRestrictionsAsync(allItems, cancellationToken);
            var filteredCandidateIds = filtered.Select(resume => resume.CandidateId).Distinct().ToList();
            profileAttributes = await LoadProfileAttributesAsync(filteredCandidateIds, cancellationToken);
            var ordered = await OrderViewerListInMemoryAsync(
                filtered,
                defaultAttributes,
                profileAttributes,
                pagination,
                cancellationToken);
            totalCount = ordered.Count;
            pageItems = ordered.Skip(pagination.Skip).Take(pagination.NormalizedSize).ToList();
        }
        else
        {
            query = await ApplyViewerListSortAsync(query, pagination, cancellationToken);
            totalCount = await query.CountAsync(cancellationToken);
            pageItems = await query
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

            var candidateIds = pageItems.Select(resume => resume.CandidateId).Distinct().ToList();
            profileAttributes = await LoadProfileAttributesAsync(candidateIds, cancellationToken);
        }

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

        var files = await LoadFilesForAttributesAsync(defaultAttributes, profileAttributes, cancellationToken);
        var items = MapList(pageItems, defaultAttributes, profileAttributes, files);
        await EnrichWithLikesAsync(items, userId, cancellationToken);

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
        string? viewerUserId = null,
        bool isAdmin = false,
        CancellationToken cancellationToken = default)
    {
        var resumes = await db.Resumes
            .AsNoTracking()
            .Include(resume => resume.Position)
            .Where(resume => resume.PositionId == positionId && resume.Published)
            .ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var matchIds = lucene.Search(SearchEntityTypes.Resume, pagination.Search).ToHashSet();
            resumes = resumes.Where(resume => matchIds.Contains(resume.Id)).ToList();
        }

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

        var defaultAttributes = await LoadDefaultAttributesAsync(cancellationToken);
        IReadOnlyList<ProfileAttribute> profileAttributes;
        IReadOnlyList<ResumeEntity> filtered;

        if (isAdmin)
        {
            var candidateIds = resumes.Select(resume => resume.CandidateId).Distinct().ToList();
            profileAttributes = await LoadProfileAttributesAsync(candidateIds, cancellationToken);
            filtered = resumes;
        }
        else
        {
            var restrictions = await restrictionEvaluator.GetRestrictionsForPositionAsync(positionId, cancellationToken);
            var candidateIds = resumes.Select(resume => resume.CandidateId).Distinct().ToList();

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
            "likes" or "likescount" => await OrderByLikesAsync(filtered, pagination.IsDescending, cancellationToken),
            "lastname" => OrderByCandidateName(filtered, defaultAttributes, profileAttributes, lastNameFirst: true, descending: pagination.IsDescending),
            "candidate" or "candidatename" or "candidateid" => OrderByCandidateName(
                filtered,
                defaultAttributes,
                profileAttributes,
                lastNameFirst: false,
                descending: pagination.IsDescending),
            _ => OrderByCandidateName(filtered, defaultAttributes, profileAttributes, lastNameFirst: false, descending: pagination.IsDescending),
        };
        var totalCount = ordered.Count;
        var pageItems = ordered.Skip(pagination.Skip).Take(pagination.NormalizedSize).ToList();
        var files = await LoadFilesForAttributesAsync(defaultAttributes, profileAttributes, cancellationToken);
        var items = MapList(pageItems, defaultAttributes, profileAttributes, files);
        await EnrichWithLikesAsync(items, viewerUserId, cancellationToken);

        return new PagedResult<ResumeListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = pagination.NormalizedPage,
            Size = pagination.NormalizedSize,
        };
    }

    public async Task<ResumeDto?> GetByIdAsync(
        int id,
        string? viewerUserId = null,
        CancellationToken cancellationToken = default)
    {
        var resume = await db.Resumes
            .AsNoTracking()
            .Include(item => item.Position)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (resume is null)
        {
            return null;
        }

        return await MapSingleAsync(resume, viewerUserId, cancellationToken);
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

        if (!isAdmin
            && !await restrictionEvaluator.CandidateMeetsAllRestrictionsAsync(
                resume.CandidateId,
                resume.PositionId,
                cancellationToken))
        {
            return ResumeGetResult.NotFoundResult();
        }

        var dto = await MapSingleAsync(resume, userId, cancellationToken);
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

        if (request.Published && !resume.Published)
        {
            await EnsureCanPublishAsync(resume, cancellationToken);
        }

        resume.Published = request.Published;
        resume.Version++;
        await db.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken: cancellationToken);
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
        searchIndex.DeleteResumes([id]);
        return true;
    }

    public async Task DeleteBatchAsync(
        IEnumerable<DeleteResumeItem> items,
        CancellationToken cancellationToken = default)
    {
        var uniqueItems = items
            .GroupBy(item => item.Id)
            .Select(group => group.Last())
            .ToList();

        if (uniqueItems.Count == 0)
        {
            return;
        }

        var ids = uniqueItems.Select(item => item.Id).ToList();
        var resumes = await db.Resumes
            .Where(item => ids.Contains(item.Id))
            .ToListAsync(cancellationToken);

        if (resumes.Count != ids.Count)
        {
            throw new InvalidOperationException("error.resumes.notFound");
        }

        var versionById = uniqueItems.ToDictionary(item => item.Id, item => item.Version);
        foreach (var resume in resumes)
        {
            if (resume.Version != versionById[resume.Id])
            {
                throw new InvalidOperationException(VersionChangedMessage);
            }
        }

        db.Resumes.RemoveRange(resumes);
        await db.SaveChangesAsync(cancellationToken);
        searchIndex.DeleteResumes(ids);
    }

    public async Task<ResumeLikeStateDto?> ToggleLikeAsync(
        int resumeId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var resume = await db.Resumes
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == resumeId, cancellationToken);
        if (resume is null)
        {
            return null;
        }

        if (!resume.Published)
        {
            throw new InvalidOperationException("error.resumes.notPublished");
        }

        if (!await restrictionEvaluator.CandidateMeetsAllRestrictionsAsync(
                resume.CandidateId,
                resume.PositionId,
                cancellationToken))
        {
            return null;
        }

        var existing = await db.LikesResumes
            .FirstOrDefaultAsync(like => like.ResumeId == resumeId && like.UserId == userId, cancellationToken);

        if (existing is null)
        {
            db.LikesResumes.Add(new LikesResume
            {
                ResumeId = resumeId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            db.LikesResumes.Remove(existing);
        }

        await db.SaveChangesAsync(cancellationToken);

        var likesCount = await db.LikesResumes
            .AsNoTracking()
            .CountAsync(like => like.ResumeId == resumeId, cancellationToken);

        return new ResumeLikeStateDto
        {
            LikesCount = likesCount,
            LikedByCurrentUser = existing is null,
        };
    }

    public async Task<ResumePdfResult> GeneratePdfForViewerAsync(
        int id,
        string? userId,
        bool isAdmin,
        bool isRecruiter,
        string? locale = null,
        CancellationToken cancellationToken = default)
    {
        var result = await GetByIdForViewerAsync(id, userId, isAdmin, isRecruiter, cancellationToken);
        if (result.NotFound)
        {
            return ResumePdfResult.NotFoundResult();
        }

        if (result.Forbidden || result.Dto is null)
        {
            return ResumePdfResult.ForbiddenResult();
        }

        if (!result.Dto.Published)
        {
            return ResumePdfResult.NotPublishedResult();
        }

        var photoBytes = await TryLoadPhotoBytesAsync(result.Dto, cancellationToken);
        var content = ResumePdfGenerator.Generate(result.Dto, photoBytes, locale);
        var fileName = ResumePdfGenerator.BuildFileName(result.Dto, locale);
        return ResumePdfResult.Ok(content, fileName);
    }

    private async Task<byte[]?> TryLoadPhotoBytesAsync(ResumeDto resume, CancellationToken cancellationToken)
    {
        var photo = resume.Attributes.FirstOrDefault(attribute => attribute.Name == DefaultAttributes.Photo);
        if (photo?.Value is not FileAttributeValueDto file || string.IsNullOrWhiteSpace(file.Url))
        {
            return null;
        }

        if (!Uri.TryCreate(file.Url, UriKind.Absolute, out var photoUri)
            || (photoUri.Scheme != Uri.UriSchemeHttps && photoUri.Scheme != Uri.UriSchemeHttp))
        {
            return null;
        }

        try
        {
            var httpClient = httpClientFactory.CreateClient("CloudinaryAssets");
            using var response = await httpClient.GetAsync(photoUri, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return await response.Content.ReadAsByteArrayAsync(cancellationToken);
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return null;
        }
    }

    public bool CanView(ResumeEntity resume, string? userId, bool isAdmin, bool isRecruiter) =>
        isAdmin
        || (isRecruiter && resume.Published)
        || resume.CandidateId == userId;

    public bool CanModify(ResumeEntity resume, string? userId, bool isAdmin) =>
        isAdmin || resume.CandidateId == userId;

    private async Task<List<ResumeEntity>> FilterResumesMeetingPositionRestrictionsAsync(
        IReadOnlyList<ResumeEntity> resumes,
        CancellationToken cancellationToken)
    {
        if (resumes.Count == 0)
        {
            return [];
        }

        var positionIds = resumes.Select(resume => resume.PositionId).Distinct().ToList();
        var restrictedPositionIds = await restrictionEvaluator.GetPositionIdsWithRestrictionsAsync(
            positionIds,
            cancellationToken);

        if (restrictedPositionIds.Count == 0)
        {
            return resumes.ToList();
        }

        var result = resumes.Where(resume => !restrictedPositionIds.Contains(resume.PositionId)).ToList();
        var toCheck = resumes.Where(resume => restrictedPositionIds.Contains(resume.PositionId)).ToList();
        if (toCheck.Count == 0)
        {
            return result;
        }

        var candidateIds = toCheck.Select(resume => resume.CandidateId).Distinct().ToList();
        var contexts = await restrictionEvaluator.LoadCandidateContextsAsync(candidateIds, cancellationToken);

        foreach (var group in toCheck.GroupBy(resume => resume.PositionId))
        {
            var restrictions = await restrictionEvaluator.GetRestrictionsForPositionAsync(
                group.Key,
                cancellationToken);
            result.AddRange(
                restrictionEvaluator.FilterByRestrictions(
                    restrictions,
                    group.ToList(),
                    resume => resume.CandidateId,
                    contexts));
        }

        return result;
    }

    private async Task<List<ResumeEntity>> OrderViewerListInMemoryAsync(
        IReadOnlyList<ResumeEntity> resumes,
        IReadOnlyList<AttributeEntity> defaultAttributes,
        IReadOnlyList<ProfileAttribute> profileAttributes,
        PaginationParams pagination,
        CancellationToken cancellationToken) =>
        pagination.NormalizedSortBy switch
        {
            "id" => pagination.IsDescending
                ? resumes.OrderByDescending(resume => resume.Id).ToList()
                : resumes.OrderBy(resume => resume.Id).ToList(),
            "positionname" or "position" => pagination.IsDescending
                ? resumes.OrderByDescending(resume => resume.Position.Name).ToList()
                : resumes.OrderBy(resume => resume.Position.Name).ToList(),
            "published" => pagination.IsDescending
                ? resumes.OrderByDescending(resume => resume.Published).ToList()
                : resumes.OrderBy(resume => resume.Published).ToList(),
            "likes" or "likescount" => await OrderByLikesAsync(resumes, pagination.IsDescending, cancellationToken),
            "candidate" or "candidatename" or "candidateid" => OrderByCandidateName(
                resumes,
                defaultAttributes,
                profileAttributes,
                lastNameFirst: false,
                descending: pagination.IsDescending),
            _ => pagination.IsDescending
                ? resumes.OrderByDescending(resume => resume.CreatedAt).ToList()
                : resumes.OrderBy(resume => resume.CreatedAt).ToList(),
        };

    private async Task EnsureCanPublishAsync(ResumeEntity resume, CancellationToken cancellationToken)
    {
        var positionAttributeIds = await db.PositionAttributes
            .AsNoTracking()
            .Where(item => item.PositionId == resume.PositionId)
            .Select(item => item.AttributeId)
            .ToListAsync(cancellationToken);

        var defaultAttributes = await LoadDefaultAttributesAsync(cancellationToken);
        var positionAttributes = positionAttributeIds.Count == 0
            ? []
            : (await db.Attributes.AsNoTracking().ToListAsync(cancellationToken))
                .Where(attribute => positionAttributeIds.Contains(attribute.Id))
                .ToList();

        var requiredAttributes = defaultAttributes
            .Concat(positionAttributes)
            .GroupBy(attribute => attribute.Id)
            .Select(group => group.First())
            .ToList();

        var profileAttributes = await LoadProfileAttributesAsync([resume.CandidateId], cancellationToken);
        var profileByAttributeId = profileAttributes.ToDictionary(item => item.AttributeId);

        foreach (var attribute in requiredAttributes)
        {
            profileByAttributeId.TryGetValue(attribute.Id, out var profileAttribute);
            if (!valueMapper.HasValue(profileAttribute, attribute))
            {
                throw new InvalidOperationException(IncompleteAttributesMessage);
            }
        }
    }

    private async Task<ResumeDto?> MapSingleAsync(
        ResumeEntity resume,
        string? viewerUserId,
        CancellationToken cancellationToken)
    {
        var items = await MapManyAsync([resume], viewerUserId, cancellationToken);
        return items.FirstOrDefault();
    }

    private async Task<IReadOnlyList<ResumeDto>> MapManyAsync(
        IReadOnlyList<ResumeEntity> resumes,
        string? viewerUserId,
        CancellationToken cancellationToken)
    {
        if (resumes.Count == 0)
        {
            return [];
        }

        var defaultAttributes = await LoadDefaultAttributesAsync(cancellationToken);
        var candidateIds = resumes.Select(resume => resume.CandidateId).Distinct().ToList();
        var profileAttributes = await LoadProfileAttributesAsync(candidateIds, cancellationToken);
        var files = await LoadFilesForAttributesAsync(defaultAttributes, profileAttributes, cancellationToken);
        var listItems = MapList(resumes, defaultAttributes, profileAttributes, files).ToList();
        await EnrichWithLikesAsync(listItems, viewerUserId, cancellationToken);

        var positionIds = resumes.Select(resume => resume.PositionId).Distinct().ToList();
        var positionAttributeRows = await db.PositionAttributes
            .AsNoTracking()
            .Where(item => positionIds.Contains(item.PositionId))
            .Select(item => new { item.PositionId, item.AttributeId })
            .ToListAsync(cancellationToken);
        var attributesByPosition = positionAttributeRows
            .GroupBy(item => item.PositionId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(item => item.AttributeId).ToHashSet());

        var positionTagRows = await db.PositionTags
            .AsNoTracking()
            .Where(item => positionIds.Contains(item.PositionId))
            .Select(item => new { item.PositionId, item.TagId })
            .ToListAsync(cancellationToken);
        var tagsByPosition = positionTagRows
            .GroupBy(item => item.PositionId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(item => item.TagId).ToHashSet());

        var meInfoByCandidate = new Dictionary<string, IReadOnlyList<ProfileAttributeDto>>(
            StringComparer.Ordinal);
        foreach (var candidateId in candidateIds)
        {
            meInfoByCandidate[candidateId] =
                await profileService.GetMeInfoAsync(candidateId, cancellationToken) ?? [];
        }

        var projectsByCandidate = new Dictionary<string, List<ProfileProjectEntity>>(StringComparer.Ordinal);
        foreach (var candidateId in candidateIds)
        {
            projectsByCandidate[candidateId] = await db.ProfileProjects
                .AsNoTracking()
                .Where(project => project.CandidateId == candidateId)
                .Include(project => project.ProfileProjectTags)
                .ThenInclude(tag => tag.Tag)
                .OrderByDescending(project => project.CreatedAt)
                .ToListAsync(cancellationToken);
        }

        var missingMaxProjects = resumes
            .Where(resume => resume.Position is null)
            .Select(resume => resume.PositionId)
            .Distinct()
            .ToList();
        var maxProjectsByPosition = missingMaxProjects.Count == 0
            ? new Dictionary<int, int>()
            : await db.Positions
                .AsNoTracking()
                .Where(position => missingMaxProjects.Contains(position.Id))
                .ToDictionaryAsync(position => position.Id, position => position.MaxProjects, cancellationToken);

        var resumeById = resumes.ToDictionary(resume => resume.Id);
        foreach (var listItem in listItems)
        {
            var resume = resumeById[listItem.Id];
            var positionAttributeIds = attributesByPosition.GetValueOrDefault(resume.PositionId) ?? [];
            var attributes = meInfoByCandidate[resume.CandidateId];
            listItem.Attributes =
            [
                .. attributes.Where(attribute =>
                    attribute.IsDefault || positionAttributeIds.Contains(attribute.Id)),
            ];

            listItem.MaxProjects = resume.Position?.MaxProjects
                ?? maxProjectsByPosition.GetValueOrDefault(resume.PositionId);

            var tagIds = tagsByPosition.GetValueOrDefault(resume.PositionId);
            if (tagIds is null || tagIds.Count == 0)
            {
                listItem.Projects = [];
                continue;
            }

            var matching = projectsByCandidate[resume.CandidateId]
                .Where(project => project.ProfileProjectTags.Any(tag => tagIds.Contains(tag.TagId)))
                .ToList();

            if (listItem.MaxProjects > 0)
            {
                matching = matching.Take(listItem.MaxProjects).ToList();
            }

            listItem.Projects = matching.Select(MapProject).ToList();
        }

        return listItems;
    }

    private async Task EnrichWithLikesAsync(
        IReadOnlyList<ResumeListItemDto> items,
        string? viewerUserId,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            return;
        }

        var resumeIds = items.Select(item => item.Id).ToList();
        var likes = await db.LikesResumes
            .AsNoTracking()
            .Where(like => resumeIds.Contains(like.ResumeId))
            .Select(like => new { like.ResumeId, like.UserId })
            .ToListAsync(cancellationToken);

        var counts = likes
            .GroupBy(like => like.ResumeId)
            .ToDictionary(group => group.Key, group => group.Count());

        var likedIds = string.IsNullOrWhiteSpace(viewerUserId)
            ? new HashSet<int>()
            : likes
                .Where(like => like.UserId == viewerUserId)
                .Select(like => like.ResumeId)
                .ToHashSet();

        foreach (var item in items)
        {
            item.LikesCount = counts.GetValueOrDefault(item.Id);
            item.LikedByCurrentUser = likedIds.Contains(item.Id);
        }
    }

    private static ProjectDto MapProject(ProfileProjectEntity project) => new()
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

        return await db.ProfileAttributes
            .AsNoTracking()
            .Include(profileAttribute => profileAttribute.Attribute)
            .Where(BuildCandidateIdEqualsAny(ids))
            .ToListAsync(cancellationToken);
    }

    private static Expression<Func<ProfileAttribute, bool>> BuildCandidateIdEqualsAny(IReadOnlyList<string> ids)
    {
        var parameter = Expression.Parameter(typeof(ProfileAttribute), "profileAttribute");
        var property = Expression.Property(parameter, nameof(ProfileAttribute.CandidateId));

        Expression? body = null;
        foreach (var id in ids)
        {
            var equals = Expression.Equal(property, Expression.Constant(id, typeof(string)));
            body = body is null ? equals : Expression.OrElse(body, equals);
        }

        return Expression.Lambda<Func<ProfileAttribute, bool>>(body!, parameter);
    }

    private async Task<IQueryable<ResumeEntity>> ApplyViewerListSortAsync(
        IQueryable<ResumeEntity> query,
        PaginationParams pagination,
        CancellationToken cancellationToken)
    {
        switch (pagination.NormalizedSortBy)
        {
            case "id":
                return pagination.IsDescending
                    ? query.OrderByDescending(resume => resume.Id)
                    : query.OrderBy(resume => resume.Id);
            case "positionname":
            case "position":
                return pagination.IsDescending
                    ? query.OrderByDescending(resume => resume.Position.Name)
                    : query.OrderBy(resume => resume.Position.Name);
            case "published":
                return pagination.IsDescending
                    ? query.OrderByDescending(resume => resume.Published)
                    : query.OrderBy(resume => resume.Published);
            case "likes":
            case "likescount":
                return pagination.IsDescending
                    ? query.OrderByDescending(resume =>
                        db.LikesResumes.Count(like => like.ResumeId == resume.Id))
                    : query.OrderBy(resume =>
                        db.LikesResumes.Count(like => like.ResumeId == resume.Id));
            case "candidate":
            case "candidatename":
            case "candidateid":
                return await ApplyCandidateNameSortAsync(query, pagination.IsDescending, cancellationToken);
            case "createdat":
            default:
                return pagination.IsDescending
                    ? query.OrderByDescending(resume => resume.CreatedAt)
                    : query.OrderBy(resume => resume.CreatedAt);
        }
    }

    private async Task<IOrderedQueryable<ResumeEntity>> ApplyCandidateNameSortAsync(
        IQueryable<ResumeEntity> query,
        bool descending,
        CancellationToken cancellationToken)
    {
        var firstNameAttributeId = await ResolveAttributeIdAsync(DefaultAttributes.FirstName, cancellationToken);
        var lastNameAttributeId = await ResolveAttributeIdAsync(DefaultAttributes.LastName, cancellationToken);

        if (!firstNameAttributeId.HasValue && !lastNameAttributeId.HasValue)
        {
            return descending
                ? query.OrderByDescending(resume => resume.CandidateId)
                : query.OrderBy(resume => resume.CandidateId);
        }

        if (descending)
        {
            return query
                .OrderByDescending(resume =>
                    firstNameAttributeId.HasValue
                        ? db.ProfileAttributes
                            .Where(profileAttribute =>
                                profileAttribute.CandidateId == resume.CandidateId
                                && profileAttribute.AttributeId == firstNameAttributeId.Value)
                            .Select(profileAttribute => profileAttribute.ValueString)
                            .FirstOrDefault()
                        : null)
                .ThenByDescending(resume =>
                    lastNameAttributeId.HasValue
                        ? db.ProfileAttributes
                            .Where(profileAttribute =>
                                profileAttribute.CandidateId == resume.CandidateId
                                && profileAttribute.AttributeId == lastNameAttributeId.Value)
                            .Select(profileAttribute => profileAttribute.ValueString)
                            .FirstOrDefault()
                        : null);
        }

        return query
            .OrderBy(resume =>
                firstNameAttributeId.HasValue
                    ? db.ProfileAttributes
                        .Where(profileAttribute =>
                            profileAttribute.CandidateId == resume.CandidateId
                            && profileAttribute.AttributeId == firstNameAttributeId.Value)
                        .Select(profileAttribute => profileAttribute.ValueString)
                        .FirstOrDefault()
                    : null)
            .ThenBy(resume =>
                lastNameAttributeId.HasValue
                    ? db.ProfileAttributes
                        .Where(profileAttribute =>
                            profileAttribute.CandidateId == resume.CandidateId
                            && profileAttribute.AttributeId == lastNameAttributeId.Value)
                        .Select(profileAttribute => profileAttribute.ValueString)
                        .FirstOrDefault()
                    : null);
    }

    private Task<int?> ResolveAttributeIdAsync(string attributeName, CancellationToken cancellationToken) =>
        db.Attributes
            .AsNoTracking()
            .Where(attribute => attribute.Name == attributeName)
            .Select(attribute => (int?)attribute.Id)
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<List<ResumeEntity>> OrderByLikesAsync(
        IReadOnlyList<ResumeEntity> resumes,
        bool descending,
        CancellationToken cancellationToken)
    {
        if (resumes.Count == 0)
        {
            return [];
        }

        var resumeIdSet = resumes.Select(resume => resume.Id).ToHashSet();
        var likeResumeIds = await db.LikesResumes
            .AsNoTracking()
            .Select(like => like.ResumeId)
            .ToListAsync(cancellationToken);

        var counts = likeResumeIds
            .Where(resumeIdSet.Contains)
            .GroupBy(resumeId => resumeId)
            .ToDictionary(group => group.Key, group => group.Count());

        return descending
            ? resumes.OrderByDescending(resume => counts.GetValueOrDefault(resume.Id)).ToList()
            : resumes.OrderBy(resume => counts.GetValueOrDefault(resume.Id)).ToList();
    }

    private static string BuildCandidateName(
        string candidateId,
        IReadOnlyList<AttributeEntity> defaultAttributes,
        IReadOnlyList<ProfileAttribute> profileAttributes)
    {
        var firstNameId = defaultAttributes
            .FirstOrDefault(attribute => attribute.Name == DefaultAttributes.FirstName)?.Id;
        var lastNameId = defaultAttributes
            .FirstOrDefault(attribute => attribute.Name == DefaultAttributes.LastName)?.Id;

        string GetValue(int? attributeId)
        {
            if (!attributeId.HasValue)
            {
                return string.Empty;
            }

            return profileAttributes
                .FirstOrDefault(item => item.CandidateId == candidateId && item.AttributeId == attributeId.Value)
                ?.ValueString
                ?.Trim()
                ?? string.Empty;
        }

        var parts = new[] { GetValue(firstNameId), GetValue(lastNameId) }
            .Where(part => !string.IsNullOrWhiteSpace(part));

        return string.Join(' ', parts);
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
            CandidateName = BuildCandidateName(resume.CandidateId, defaultAttributes, profileAttributes),
            PositionId = resume.PositionId,
            PositionName = resume.Position?.Name ?? string.Empty,
            MaxProjects = resume.Position?.MaxProjects ?? 0,
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
