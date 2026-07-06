using Backend.Api.Data;
using Backend.Api.Data.Relations;
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
        var query = db.Attributes.AsNoTracking().OrderBy(attribute => attribute.Name);
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
        var attribute = new AttributeEntity
        {
            Name = request.Name,
            Description = request.Description,
            ValueType = request.ValueType,
            InputType = request.InputType,
            CreatedAt = DateTime.UtcNow,
            CreatedById = userId,
        };

        db.Attributes.Add(attribute);
        await db.SaveChangesAsync(cancellationToken);
        return Map(attribute);
    }

    public async Task<AttributeDto?> UpdateAsync(
        int id,
        UpdateAttributeRequest request,
        CancellationToken cancellationToken = default)
    {
        var attribute = await db.Attributes.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (attribute is null)
        {
            return null;
        }

        attribute.Name = request.Name;
        attribute.Description = request.Description;
        attribute.ValueType = request.ValueType;
        attribute.InputType = request.InputType;

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

        if (DefaultAttributes.All.Any(item => item.Name == attribute.Name))
        {
            throw new InvalidOperationException("Default attributes cannot be deleted.");
        }

        db.Attributes.Remove(attribute);
        await db.SaveChangesAsync(cancellationToken);
        return true;
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
        CreatedAt = attribute.CreatedAt,
    };
}
