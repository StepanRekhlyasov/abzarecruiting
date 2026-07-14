using System.Linq.Expressions;
using Backend.Api.Configuration;
using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Models.Common;
using Backend.Api.Models.Files;
using Backend.Api.Models.Project;
using Backend.Api.Models.Resume;
using Backend.Api.Services.Attributes;
using Backend.Api.Services.Files;
using Backend.Api.Services.Position;
using Backend.Api.Services.Profile;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using FileEntity = Backend.Api.Data.Entities.File;
using ProfileProjectEntity = Backend.Api.Data.Entities.ProfileProject;
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
        string? candidateIdFilter = null,
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
    IOptions<FileStorageSettings> fileStorageOptions,
    IWebHostEnvironment environment) : IResumeService
{
    private const string VersionChangedMessage = "error.oldVersion";
    private const string AlreadyExistsMessage = "error.resumes.alreadyExists";
    private const string IncompleteAttributesMessage = "error.resumes.incompleteAttributes";
    private readonly FileStorageSettings _fileStorage = fileStorageOptions.Value;

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

        if (request.Published && !resume.Published)
        {
            await EnsureCanPublishAsync(resume, cancellationToken);
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

        var photoBytes = TryLoadPhotoBytes(result.Dto);
        var content = ResumePdfGenerator.Generate(result.Dto, photoBytes, locale);
        var fileName = ResumePdfGenerator.BuildFileName(result.Dto, locale);
        return ResumePdfResult.Ok(content, fileName);
    }

    private byte[]? TryLoadPhotoBytes(ResumeDto resume)
    {
        var photo = resume.Attributes.FirstOrDefault(attribute => attribute.Name == DefaultAttributes.Photo);
        if (photo?.Value is not FileAttributeValueDto file || string.IsNullOrWhiteSpace(file.Url))
        {
            return null;
        }

        var absolutePath = ResolveStoredFilePath(file.Url);
        if (absolutePath is null || !System.IO.File.Exists(absolutePath))
        {
            return null;
        }

        return System.IO.File.ReadAllBytes(absolutePath);
    }

    private string? ResolveStoredFilePath(string url)
    {
        var requestPath = _fileStorage.RequestPath.TrimEnd('/');
        var relativeUrl = url.StartsWith(requestPath, StringComparison.OrdinalIgnoreCase)
            ? url[requestPath.Length..].TrimStart('/')
            : url.TrimStart('/');

        if (string.IsNullOrWhiteSpace(relativeUrl))
        {
            return null;
        }

        var rootPath = Path.IsPathRooted(_fileStorage.RootPath)
            ? _fileStorage.RootPath
            : Path.GetFullPath(Path.Combine(environment.ContentRootPath, _fileStorage.RootPath));

        var absolutePath = Path.GetFullPath(Path.Combine(rootPath, relativeUrl.Replace('/', Path.DirectorySeparatorChar)));
        if (!absolutePath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return absolutePath;
    }

    public bool CanView(ResumeEntity resume, string? userId, bool isAdmin, bool isRecruiter) =>
        isAdmin
        || (isRecruiter && resume.Published)
        || resume.CandidateId == userId;

    public bool CanModify(ResumeEntity resume, string? userId, bool isAdmin) =>
        isAdmin || resume.CandidateId == userId;

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

    private async Task<ResumeDto?> MapSingleAsync(ResumeEntity resume, CancellationToken cancellationToken)
    {
        var defaultAttributes = await LoadDefaultAttributesAsync(cancellationToken);
        var profileAttributes = await LoadProfileAttributesAsync([resume.CandidateId], cancellationToken);
        var files = await LoadFilesForAttributesAsync(defaultAttributes, profileAttributes, cancellationToken);
        var listItem = MapList([resume], defaultAttributes, profileAttributes, files).FirstOrDefault();
        if (listItem is null)
        {
            return null;
        }

        var attributes = await profileService.GetMeInfoAsync(resume.CandidateId, cancellationToken) ?? [];
        var positionAttributeIds = await db.PositionAttributes
            .AsNoTracking()
            .Where(item => item.PositionId == resume.PositionId)
            .Select(item => item.AttributeId)
            .ToHashSetAsync(cancellationToken);

        var maxProjects = resume.Position?.MaxProjects
            ?? await db.Positions
                .AsNoTracking()
                .Where(position => position.Id == resume.PositionId)
                .Select(position => position.MaxProjects)
                .FirstOrDefaultAsync(cancellationToken);

        listItem.Attributes =
        [
            .. attributes.Where(attribute => attribute.IsDefault || positionAttributeIds.Contains(attribute.Id)),
        ];
        listItem.MaxProjects = maxProjects;
        listItem.Projects = await SelectMatchingProjectsAsync(
            resume.CandidateId,
            resume.PositionId,
            maxProjects,
            cancellationToken);

        return listItem;
    }

    private async Task<IReadOnlyList<ProjectDto>> SelectMatchingProjectsAsync(
        string candidateId,
        int positionId,
        int maxProjects,
        CancellationToken cancellationToken)
    {
        var positionTagIds = await db.PositionTags
            .AsNoTracking()
            .Where(item => item.PositionId == positionId)
            .Select(item => item.TagId)
            .ToListAsync(cancellationToken);

        if (positionTagIds.Count == 0)
        {
            return [];
        }

        var tagIdSet = positionTagIds.ToHashSet();
        var projectsQuery = db.ProfileProjects
            .AsNoTracking()
            .Where(project => project.CandidateId == candidateId)
            .Include(project => project.ProfileProjectTags)
            .ThenInclude(tag => tag.Tag)
            .OrderByDescending(project => project.CreatedAt)
            .AsQueryable();

        // Filter tags in memory — MySQL EF fails type mapping for collection Contains/IN parameters.
        var projects = await projectsQuery.ToListAsync(cancellationToken);
        var matching = projects
            .Where(project => project.ProfileProjectTags.Any(tag => tagIdSet.Contains(tag.TagId)))
            .ToList();

        if (maxProjects > 0)
        {
            matching = matching.Take(maxProjects).ToList();
        }

        return matching.Select(MapProject).ToList();
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
