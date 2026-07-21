using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Data.Entities;
using Backend.Api.Extensions;
using Backend.Api.Models.Attribute;
using Backend.Api.Models.Common;
using Backend.Api.Services.Attributes;
using Backend.Api.Services.Files;
using Backend.Api.Services.Search;
using Microsoft.EntityFrameworkCore;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Services.Attribute;

public interface IAttributeService
{
    Task<PagedResult<AttributeDto>> GetListAsync(AttributeListParams pagination, CancellationToken cancellationToken = default);

    Task<AttributeDto> CreateAsync(CreateAttributeRequest request, string userId, CancellationToken cancellationToken = default);

    Task<AttributeDto?> UpdateAsync(int id, UpdateAttributeRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default);

    Task DeleteBatchAsync(IEnumerable<DeleteAttributeItem> items, CancellationToken cancellationToken = default);

    Task<int?> SetCandidateValueAsync(
        int attributeId,
        string candidateId,
        SetProfileAttributeRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SetProfileAttributeBatchResultItem>> SetCandidateValuesBatchAsync(
        string candidateId,
        IEnumerable<SetProfileAttributeBatchItem> items,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteCandidateValueAsync(int attributeId, string candidateId, CancellationToken cancellationToken = default);
}

public class AttributeService(
    ApplicationDbContext db,
    IAttributeValueMapper valueMapper,
    ISearchIndexService searchIndex,
    ILuceneIndex lucene) : IAttributeService
{
    public async Task<PagedResult<AttributeDto>> GetListAsync(
        AttributeListParams pagination,
        CancellationToken cancellationToken = default)
    {
        IQueryable<AttributeEntity> query = db.Attributes
            .AsNoTracking()
            .Include(attribute => attribute.Options)
            .Where(attribute => !DefaultAttributes.Names.Contains(attribute.Name));

        if (!string.IsNullOrWhiteSpace(pagination.Category))
        {
            var category = pagination.Category.Trim();
            query = query.Where(attribute => attribute.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(pagination.ValueType))
        {
            var valueType = pagination.ValueType.Trim();
            query = query.Where(attribute => attribute.ValueType == valueType);
        }

        query = query.WhereMatchesIdsOrFullText(
            lucene,
            SearchEntityTypes.Attribute,
            pagination.Ids,
            pagination.Searches,
            pagination.Search,
            attribute => attribute.Id);

        query = query.ApplySort(pagination, attribute => attribute.Name);

        var page = await query.ToPagedResultAsync(pagination, cancellationToken);
        return page.Items
            .Select(Map)
            .ToList()
            .ToPagedResult(page.TotalCount, pagination);
    }

    public async Task<AttributeDto> CreateAsync(
        CreateAttributeRequest request,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        await EnsureNameIsUniqueAsync(name, excludeId: null, cancellationToken);

        if (!AttributeCategories.IsValid(request.Category))
        {
            throw new InvalidOperationException("error.attributes.invalidCategory");
        }

        var inputType = InferInputType(request.ValueType);
        var options = NormalizeOptions(request.Options);

        var attribute = new AttributeEntity
        {
            Name = name,
            Description = request.Description,
            Category = request.Category,
            ValueType = request.ValueType,
            InputType = inputType,
            CreatedAt = DateTime.UtcNow,
            CreatedById = userId,
        };

        if (inputType == "select" && options.Count > 0)
        {
            attribute.Options = options
                .Select(value => new AttributeOption { InputOption = value })
                .ToList();
        }

        db.Attributes.Add(attribute);
        await db.SaveChangesAsync(cancellationToken);
        await searchIndex.RebuildAttributeAsync(attribute.Id, cancellationToken);
        return Map(attribute);
    }

    public async Task<AttributeDto?> UpdateAsync(
        int id,
        UpdateAttributeRequest request,
        CancellationToken cancellationToken = default)
    {
        var attribute = await db.Attributes
            .Include(item => item.Options)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (attribute is null)
        {
            return null;
        }

        if (DefaultAttributes.IsDefaultName(attribute.Name))
        {
            throw new InvalidOperationException("error.attributes.editDefault");
        }

        VersionedEntityExtensions.EnsureVersion(attribute.Version, request.Version);

        var name = request.Name.Trim();
        await EnsureNameIsUniqueAsync(name, attribute.Id, cancellationToken);

        if (!AttributeCategories.IsValid(request.Category))
        {
            throw new InvalidOperationException("error.attributes.invalidCategory");
        }

        var inputType = InferInputType(request.ValueType);
        var options = NormalizeOptions(request.Options);

        attribute.Name = name;
        attribute.Description = request.Description;
        attribute.Category = request.Category;
        attribute.ValueType = request.ValueType;
        attribute.InputType = inputType;

        if (attribute.Options.Count > 0)
        {
            db.AttributeOptions.RemoveRange(attribute.Options);
            attribute.Options.Clear();
        }

        if (inputType == "select" && options.Count > 0)
        {
            foreach (var value in options)
            {
                attribute.Options.Add(new AttributeOption { InputOption = value });
            }
        }

        attribute.Version++;
        await db.SaveChangesAsync(cancellationToken);
        await searchIndex.RebuildAttributeAsync(id, cancellationToken);
        return Map(attribute);
    }

    public async Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default)
    {
        var attribute = await db.Attributes.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (attribute is null)
        {
            return false;
        }

        if (DefaultAttributes.IsDefaultName(attribute.Name))
        {
            throw new InvalidOperationException("error.attributes.editDefault");
        }

        VersionedEntityExtensions.EnsureVersion(attribute.Version, version);

        db.Attributes.Remove(attribute);
        await db.SaveChangesAsync(cancellationToken);
        searchIndex.DeleteAttributes([id]);
        return true;
    }

    public async Task DeleteBatchAsync(IEnumerable<DeleteAttributeItem> items, CancellationToken cancellationToken = default)
    {
        var uniqueItems = VersionedEntityExtensions.DeduplicateById(items, item => item.Id);

        if (uniqueItems.Count == 0)
        {
            return;
        }

        var ids = uniqueItems.Select(item => item.Id).ToList();
        var attributes = await db.Attributes
            .Where(item => ids.Contains(item.Id))
            .ToListAsync(cancellationToken);

        if (attributes.Count != ids.Count)
        {
            throw new InvalidOperationException("error.attributes.notFound");
        }

        if (attributes.Any(item => DefaultAttributes.IsDefaultName(item.Name)))
        {
            throw new InvalidOperationException("error.attributes.editDefault");
        }

        var versionById = uniqueItems.ToDictionary(item => item.Id, item => item.Version);
        VersionedEntityExtensions.EnsureAllVersionsMatch(
            attributes,
            versionById,
            attribute => attribute.Id,
            attribute => attribute.Version);

        db.Attributes.RemoveRange(attributes);
        await db.SaveChangesAsync(cancellationToken);
        searchIndex.DeleteAttributes(ids);
    }

    public async Task<int?> SetCandidateValueAsync(
        int attributeId,
        string candidateId,
        SetProfileAttributeRequest request,
        CancellationToken cancellationToken = default)
    {
        var attribute = await db.Attributes.FirstOrDefaultAsync(item => item.Id == attributeId, cancellationToken);
        if (attribute is null || !await db.Users.AnyAsync(user => user.Id == candidateId, cancellationToken))
        {
            return null;
        }

        var profileAttribute = await db.ProfileAttributes
            .FirstOrDefaultAsync(item => item.AttributeId == attributeId && item.CandidateId == candidateId, cancellationToken);

        if (profileAttribute is null)
        {
            VersionedEntityExtensions.EnsureVersion(0, request.Version);

            profileAttribute = new ProfileAttribute
            {
                AttributeId = attributeId,
                CandidateId = candidateId,
                Version = 0,
            };
            db.ProfileAttributes.Add(profileAttribute);
        }
        else
        {
            VersionedEntityExtensions.EnsureVersion(profileAttribute.Version, request.Version);
        }

        if (FileAttributeValueResolver.IsFileValueType(attribute.ValueType)
            && !string.IsNullOrWhiteSpace(request.Value))
        {
            if (!Guid.TryParse(request.Value, out var fileUid)
                || !await db.Files.AnyAsync(file => file.Uid == fileUid, cancellationToken))
            {
                throw new InvalidOperationException("error.files.notFound");
            }
        }

        valueMapper.SetValue(profileAttribute, attribute, request.Value);
        profileAttribute.Version++;
        await db.SaveChangesAsync(cancellationToken);
        await searchIndex.RebuildResumesForCandidateAsync(candidateId, cancellationToken);
        return profileAttribute.Version;
    }

    public async Task<IReadOnlyList<SetProfileAttributeBatchResultItem>> SetCandidateValuesBatchAsync(
        string candidateId,
        IEnumerable<SetProfileAttributeBatchItem> items,
        CancellationToken cancellationToken = default)
    {
        var uniqueItems = items
            .GroupBy(item => item.AttributeId)
            .Select(group => group.Last())
            .ToList();

        if (uniqueItems.Count == 0)
        {
            return [];
        }

        if (!await db.Users.AnyAsync(user => user.Id == candidateId, cancellationToken))
        {
            throw new InvalidOperationException("error.profile.notCandidate");
        }

        var attributeIds = uniqueItems.Select(item => item.AttributeId).ToList();
        var attributes = await db.Attributes
            .Where(item => attributeIds.Contains(item.Id))
            .ToListAsync(cancellationToken);

        if (attributes.Count != attributeIds.Count)
        {
            throw new InvalidOperationException("error.attributes.notFound");
        }

        var attributesById = attributes.ToDictionary(item => item.Id);
        var profileAttributes = await db.ProfileAttributes
            .Where(item => item.CandidateId == candidateId && attributeIds.Contains(item.AttributeId))
            .ToListAsync(cancellationToken);
        var profileByAttributeId = profileAttributes.ToDictionary(item => item.AttributeId);

        var results = new List<SetProfileAttributeBatchResultItem>();

        foreach (var item in uniqueItems)
        {
            var attribute = attributesById[item.AttributeId];
            if (!profileByAttributeId.TryGetValue(item.AttributeId, out var profileAttribute))
            {
                VersionedEntityExtensions.EnsureVersion(0, item.Version);

                profileAttribute = new ProfileAttribute
                {
                    AttributeId = item.AttributeId,
                    CandidateId = candidateId,
                    Version = 0,
                };
                db.ProfileAttributes.Add(profileAttribute);
                profileByAttributeId[item.AttributeId] = profileAttribute;
            }
            else
            {
                VersionedEntityExtensions.EnsureVersion(profileAttribute.Version, item.Version);
            }

            if (FileAttributeValueResolver.IsFileValueType(attribute.ValueType)
                && !string.IsNullOrWhiteSpace(item.Value))
            {
                if (!Guid.TryParse(item.Value, out var fileUid)
                    || !await db.Files.AnyAsync(file => file.Uid == fileUid, cancellationToken))
                {
                    throw new InvalidOperationException("error.files.notFound");
                }
            }

            valueMapper.SetValue(profileAttribute, attribute, item.Value);
            profileAttribute.Version++;
            results.Add(new SetProfileAttributeBatchResultItem
            {
                AttributeId = item.AttributeId,
                Version = profileAttribute.Version,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        await searchIndex.RebuildResumesForCandidateAsync(candidateId, cancellationToken);
        return results;
    }

    public async Task<bool> DeleteCandidateValueAsync(
        int attributeId,
        string candidateId,
        CancellationToken cancellationToken = default)
    {
        var profileAttribute = await db.ProfileAttributes
            .FirstOrDefaultAsync(item => item.AttributeId == attributeId && item.CandidateId == candidateId, cancellationToken);

        if (profileAttribute is null)
        {
            return false;
        }

        var usedInResume = await (
            from resume in db.Resumes.AsNoTracking()
            where resume.CandidateId == candidateId
            join positionAttribute in db.PositionAttributes.AsNoTracking()
                on resume.PositionId equals positionAttribute.PositionId
            where positionAttribute.AttributeId == attributeId
            select positionAttribute.AttributeId
        ).AnyAsync(cancellationToken);

        if (usedInResume)
        {
            throw new InvalidOperationException("error.attributes.usedInResume");
        }

        db.ProfileAttributes.Remove(profileAttribute);
        await db.SaveChangesAsync(cancellationToken);
        await searchIndex.RebuildResumesForCandidateAsync(candidateId, cancellationToken);
        return true;
    }

    private static AttributeDto Map(AttributeEntity attribute) => new()
    {
        Id = attribute.Id,
        Name = attribute.Name,
        Description = attribute.Description,
        Category = attribute.Category,
        ValueType = attribute.ValueType,
        InputType = attribute.InputType,
        Options = attribute.Options
            .OrderBy(option => option.Id)
            .Select(option => option.InputOption)
            .ToList(),
        CreatedAt = attribute.CreatedAt,
        Version = attribute.Version,
    };

    private static string InferInputType(string valueType)
    {
        // valueType приходит с фронта в виде ключа (например "string", "select", ...)
        return valueType switch
        {
            "string" => "text",
            "text" => "textarea",
            "number" => "number",
            "boolean" => "checkbox",
            "date" => "date",
            "select" => "select",
            "period" => "period",
            "image" => "image",
            "file" => "file",
            _ => throw new InvalidOperationException("error.attributes.unsupportedValueType"),
        };
    }

    private static List<string> NormalizeOptions(IList<string>? options)
    {
        if (options is null || options.Count == 0)
        {
            return [];
        }

        return options
            .Select(option => option?.Trim())
            .Where(option => !string.IsNullOrWhiteSpace(option))
            .Distinct(StringComparer.Ordinal)
            .ToList()!;
    }

    private async Task EnsureNameIsUniqueAsync(
        string name,
        int? excludeId,
        CancellationToken cancellationToken)
    {
        var query = db.Attributes.Where(item => item.Name == name);

        if (excludeId.HasValue)
        {
            query = query.Where(item => item.Id != excludeId.Value);
        }

        if (await query.AnyAsync(cancellationToken))
        {
            throw new InvalidOperationException("error.attributes.nameExists");
        }
    }
}
