using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Data.Entities;
using Backend.Api.Extensions;
using Backend.Api.Models.Attribute;
using Backend.Api.Models.Common;
using Backend.Api.Services.Attributes;
using Backend.Api.Services.Files;
using Microsoft.EntityFrameworkCore;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Services.Attribute;

public interface IAttributeService
{
    Task<PagedResult<AttributeDto>> GetListAsync(PaginationParams pagination, CancellationToken cancellationToken = default);

    Task<AttributeDto> CreateAsync(CreateAttributeRequest request, string userId, CancellationToken cancellationToken = default);

    Task<AttributeDto?> UpdateAsync(int id, UpdateAttributeRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default);

    Task DeleteBatchAsync(IEnumerable<DeleteAttributeItem> items, CancellationToken cancellationToken = default);

    Task<int?> SetCandidateValueAsync(
        int attributeId,
        string candidateId,
        SetProfileAttributeRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteCandidateValueAsync(int attributeId, string candidateId, CancellationToken cancellationToken = default);
}

public class AttributeService(ApplicationDbContext db, IAttributeValueMapper valueMapper) : IAttributeService
{
    private const string VersionChangedMessage = "error.oldVersion";

    public async Task<PagedResult<AttributeDto>> GetListAsync(
        PaginationParams pagination,
        CancellationToken cancellationToken = default)
    {
        IQueryable<AttributeEntity> query = db.Attributes
            .AsNoTracking()
            .Include(attribute => attribute.Options)
            .Where(attribute => !DefaultAttributes.Names.Contains(attribute.Name));

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(attribute =>
                attribute.Name.Contains(search)
                || (attribute.Description != null && attribute.Description.Contains(search)));
        }

        query = query.ApplySort(pagination, attribute => attribute.Name);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedSize)
            .Select(attribute => Map(attribute))
            .ToListAsync(cancellationToken);

        return new PagedResult<AttributeDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = pagination.NormalizedPage,
            Size = pagination.NormalizedSize,
        };
    }

    public async Task<AttributeDto> CreateAsync(
        CreateAttributeRequest request,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        await EnsureNameIsUniqueAsync(name, excludeId: null, cancellationToken);

        var inputType = InferInputType(request.ValueType);
        var options = NormalizeOptions(request.Options);

        var attribute = new AttributeEntity
        {
            Name = name,
            Description = request.Description,
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

        if (attribute.Version != request.Version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }

        var name = request.Name.Trim();
        await EnsureNameIsUniqueAsync(name, attribute.Id, cancellationToken);

        var inputType = InferInputType(request.ValueType);
        var options = NormalizeOptions(request.Options);

        attribute.Name = name;
        attribute.Description = request.Description;
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

        if (attribute.Version != version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }

        db.Attributes.Remove(attribute);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task DeleteBatchAsync(IEnumerable<DeleteAttributeItem> items, CancellationToken cancellationToken = default)
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

        foreach (var attribute in attributes)
        {
            if (attribute.Version != versionById[attribute.Id])
            {
                throw new InvalidOperationException(VersionChangedMessage);
            }
        }

        db.Attributes.RemoveRange(attributes);
        await db.SaveChangesAsync(cancellationToken);
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
            if (request.Version != 0)
            {
                throw new InvalidOperationException(VersionChangedMessage);
            }

            profileAttribute = new ProfileAttribute
            {
                AttributeId = attributeId,
                CandidateId = candidateId,
                Version = 0,
            };
            db.ProfileAttributes.Add(profileAttribute);
        }
        else if (profileAttribute.Version != request.Version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
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
        return profileAttribute.Version;
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

        db.ProfileAttributes.Remove(profileAttribute);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static AttributeDto Map(AttributeEntity attribute) => new()
    {
        Id = attribute.Id,
        Name = attribute.Name,
        Description = attribute.Description,
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
