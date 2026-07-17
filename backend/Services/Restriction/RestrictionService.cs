using Backend.Api.Data;
using Backend.Api.Data.Enums;
using Backend.Api.Data.Relations;
using Backend.Api.Models.Restriction;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Restriction;

public interface IRestrictionService
{
    Task<IReadOnlyList<RestrictionDto>> GetByPositionIdAsync(
        int positionId,
        CancellationToken cancellationToken = default);

    Task<RestrictionDto?> CreateAsync(CreateRestrictionRequest request, string userId, CancellationToken cancellationToken = default);

    Task<RestrictionDto?> UpdateAsync(int id, UpdateRestrictionRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RestrictionDto>> SyncAsync(
        SyncRestrictionsRequest request,
        string userId,
        CancellationToken cancellationToken = default);
}

public class RestrictionService(ApplicationDbContext db) : IRestrictionService
{
    private const string VersionChangedMessage = "error.oldVersion";

    public async Task<IReadOnlyList<RestrictionDto>> GetByPositionIdAsync(
        int positionId,
        CancellationToken cancellationToken = default)
    {
        var items = await db.PositionRestrictions
            .AsNoTracking()
            .Include(item => item.Attribute)
            .Include(item => item.Tag)
            .Where(item => item.PositionId == positionId)
            .OrderBy(item => item.Id)
            .ToListAsync(cancellationToken);

        return items.Select(Map).ToList();
    }

    public async Task<RestrictionDto?> CreateAsync(
        CreateRestrictionRequest request,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var validationError = await ValidateRequestAsync(request, cancellationToken);
        if (validationError is not null)
        {
            throw new InvalidOperationException(validationError);
        }

        if (!await db.Positions.AnyAsync(position => position.Id == request.PositionId, cancellationToken))
        {
            return null;
        }

        var restriction = new PositionRestriction
        {
            PositionId = request.PositionId,
            AttributeId = request.AttributeId,
            TagId = request.TagId,
            TargetValue = request.TargetValue,
            Condition = request.Condition,
            CreatedAt = DateTime.UtcNow,
            CreatedById = userId,
        };

        db.PositionRestrictions.Add(restriction);
        await db.SaveChangesAsync(cancellationToken);

        return await GetMappedAsync(restriction.Id, cancellationToken);
    }

    public async Task<RestrictionDto?> UpdateAsync(
        int id,
        UpdateRestrictionRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = await ValidateRequestAsync(request, cancellationToken);
        if (validationError is not null)
        {
            throw new InvalidOperationException(validationError);
        }

        var restriction = await db.PositionRestrictions.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (restriction is null)
        {
            return null;
        }

        if (restriction.Version != request.Version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }

        restriction.PositionId = request.PositionId;
        restriction.AttributeId = request.AttributeId;
        restriction.TagId = request.TagId;
        restriction.TargetValue = request.TargetValue;
        restriction.Condition = request.Condition;
        restriction.Version++;

        await db.SaveChangesAsync(cancellationToken);
        return await GetMappedAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default)
    {
        var restriction = await db.PositionRestrictions.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (restriction is null)
        {
            return false;
        }

        if (restriction.Version != version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }

        db.PositionRestrictions.Remove(restriction);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<RestrictionDto>> SyncAsync(
        SyncRestrictionsRequest request,
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (!await db.Positions.AnyAsync(position => position.Id == request.PositionId, cancellationToken))
        {
            throw new InvalidOperationException("error.positions.notFound");
        }

        foreach (var item in request.Items)
        {
            var validationError = await ValidateRequestAsync(
                new CreateRestrictionRequest
                {
                    PositionId = request.PositionId,
                    AttributeId = item.AttributeId,
                    TagId = item.TagId,
                    TargetValue = item.TargetValue,
                    Condition = item.Condition,
                },
                cancellationToken);

            if (validationError is not null)
            {
                throw new InvalidOperationException(validationError);
            }
        }

        var current = await db.PositionRestrictions
            .Where(item => item.PositionId == request.PositionId)
            .ToListAsync(cancellationToken);

        var keptIds = request.Items
            .Where(item => item.Id.HasValue && item.Id.Value > 0)
            .Select(item => item.Id!.Value)
            .ToHashSet();

        var toRemove = current.Where(item => !keptIds.Contains(item.Id)).ToList();
        if (toRemove.Count > 0)
        {
            db.PositionRestrictions.RemoveRange(toRemove);
        }

        var currentById = current.ToDictionary(item => item.Id);

        foreach (var item in request.Items)
        {
            if (item.Id.HasValue && item.Id.Value > 0)
            {
                if (!currentById.TryGetValue(item.Id.Value, out var existing))
                {
                    throw new InvalidOperationException("error.restrictions.notFound");
                }

                if (existing.Version != (item.Version ?? 0))
                {
                    throw new InvalidOperationException(VersionChangedMessage);
                }

                existing.AttributeId = item.AttributeId;
                existing.TagId = item.TagId;
                existing.TargetValue = item.TargetValue;
                existing.Condition = item.Condition;
                existing.Version++;
                continue;
            }

            db.PositionRestrictions.Add(new PositionRestriction
            {
                PositionId = request.PositionId,
                AttributeId = item.AttributeId,
                TagId = item.TagId,
                TargetValue = item.TargetValue,
                Condition = item.Condition,
                CreatedAt = DateTime.UtcNow,
                CreatedById = userId,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        return await GetByPositionIdAsync(request.PositionId, cancellationToken);
    }

    private async Task<RestrictionDto?> GetMappedAsync(int id, CancellationToken cancellationToken)
    {
        var restriction = await db.PositionRestrictions
            .AsNoTracking()
            .Include(item => item.Attribute)
            .Include(item => item.Tag)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return restriction is null ? null : Map(restriction);
    }

    private async Task<string?> ValidateRequestAsync(
        CreateRestrictionRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Condition == RestrictionCondition.Not)
        {
            return "error.restrictions.conditionNotSupported";
        }

        if (request.AttributeId is null && request.TagId is null)
        {
            return "error.restrictions.attributeOrTagRequired";
        }

        if (request.AttributeId.HasValue && request.TagId.HasValue)
        {
            return "error.restrictions.attributeAndTagExclusive";
        }

        if (request.TagId.HasValue && request.Condition != RestrictionCondition.Exist)
        {
            return "error.restrictions.tagExistOnly";
        }

        if (request.AttributeId.HasValue
            && request.Condition is RestrictionCondition.Equal or RestrictionCondition.More or RestrictionCondition.Less
            && string.IsNullOrWhiteSpace(request.TargetValue))
        {
            return "error.restrictions.targetValueRequired";
        }

        if (request.AttributeId.HasValue
            && request.Condition is RestrictionCondition.More or RestrictionCondition.Less)
        {
            var valueType = await db.Attributes
                .AsNoTracking()
                .Where(attribute => attribute.Id == request.AttributeId.Value)
                .Select(attribute => attribute.ValueType)
                .FirstOrDefaultAsync(cancellationToken);

            if (valueType is null)
            {
                return "error.attributes.notFound";
            }

            if (!string.Equals(valueType, "number", StringComparison.OrdinalIgnoreCase))
            {
                return "error.restrictions.numericAttributeRequired";
            }
        }

        return null;
    }

    private static RestrictionDto Map(PositionRestriction restriction) => new()
    {
        Id = restriction.Id,
        PositionId = restriction.PositionId,
        AttributeId = restriction.AttributeId,
        AttributeName = restriction.Attribute?.Name,
        AttributeValueType = restriction.Attribute?.ValueType,
        TagId = restriction.TagId,
        TagName = restriction.Tag?.Name,
        TargetValue = restriction.TargetValue,
        Condition = restriction.Condition,
        CreatedAt = restriction.CreatedAt,
        CreatedById = restriction.CreatedById,
        Version = restriction.Version,
    };
}
