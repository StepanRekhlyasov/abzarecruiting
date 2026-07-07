using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Data.Entities;
using Backend.Api.Models.Attribute;
using Backend.Api.Models.Common;
using Backend.Api.Services.Attributes;
using Microsoft.EntityFrameworkCore;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Services.Attribute;

public interface IAttributeService
{
    Task<PagedResult<AttributeDto>> GetListAsync(PaginationParams pagination, CancellationToken cancellationToken = default);

    Task<AttributeDto> CreateAsync(CreateAttributeRequest request, string userId, CancellationToken cancellationToken = default);

    Task<AttributeDto?> UpdateAsync(int id, UpdateAttributeRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);

    Task DeleteBatchAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default);

    Task<bool> SetCandidateValueAsync(
        int attributeId,
        string candidateId,
        SetProfileAttributeRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteCandidateValueAsync(int attributeId, string candidateId, CancellationToken cancellationToken = default);
}

public class AttributeService(ApplicationDbContext db, IAttributeValueMapper valueMapper) : IAttributeService
{
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

        query = query.OrderBy(attribute => attribute.Name);
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
            throw new InvalidOperationException("Default attributes cannot be updated.");
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

        await db.SaveChangesAsync(cancellationToken);
        return Map(attribute);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var attribute = await db.Attributes.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (attribute is null)
        {
            return false;
        }

        if (DefaultAttributes.IsDefaultName(attribute.Name))
        {
            throw new InvalidOperationException("Default attributes cannot be deleted.");
        }

        db.Attributes.Remove(attribute);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task DeleteBatchAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default)
    {
        var uniqueIds = ids.Distinct().ToList();

        if (uniqueIds.Count == 0)
        {
            return;
        }

        var attributes = await db.Attributes
            .Where(item => uniqueIds.Contains(item.Id))
            .ToListAsync(cancellationToken);

        if (attributes.Count != uniqueIds.Count)
        {
            throw new InvalidOperationException("One or more attributes were not found.");
        }

        if (attributes.Any(item => DefaultAttributes.IsDefaultName(item.Name)))
        {
            throw new InvalidOperationException("Default attributes cannot be deleted.");
        }

        db.Attributes.RemoveRange(attributes);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> SetCandidateValueAsync(
        int attributeId,
        string candidateId,
        SetProfileAttributeRequest request,
        CancellationToken cancellationToken = default)
    {
        var attribute = await db.Attributes.FirstOrDefaultAsync(item => item.Id == attributeId, cancellationToken);
        if (attribute is null || !await db.Users.AnyAsync(user => user.Id == candidateId, cancellationToken))
        {
            return false;
        }

        var profileAttribute = await db.ProfileAttributes
            .FirstOrDefaultAsync(item => item.AttributeId == attributeId && item.CandidateId == candidateId, cancellationToken);

        if (profileAttribute is null)
        {
            profileAttribute = new ProfileAttribute
            {
                AttributeId = attributeId,
                CandidateId = candidateId,
            };
            db.ProfileAttributes.Add(profileAttribute);
        }

        valueMapper.SetValue(profileAttribute, attribute, request.Value);
        await db.SaveChangesAsync(cancellationToken);
        return true;
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
            _ => throw new InvalidOperationException($"Unsupported attribute valueType '{valueType}'."),
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
            throw new InvalidOperationException("An attribute with this name already exists.");
        }
    }
}
