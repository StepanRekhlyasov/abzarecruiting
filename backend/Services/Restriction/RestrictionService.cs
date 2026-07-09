using Backend.Api.Data;
using Backend.Api.Data.Enums;
using Backend.Api.Data.Relations;
using Backend.Api.Models.Restriction;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Restriction;

public interface IRestrictionService
{
    Task<RestrictionDto?> CreateAsync(CreateRestrictionRequest request, string userId, CancellationToken cancellationToken = default);

    Task<RestrictionDto?> UpdateAsync(int id, UpdateRestrictionRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default);
}

public class RestrictionService(ApplicationDbContext db) : IRestrictionService
{
    private const string VersionChangedMessage = "error.oldVersion";
    public async Task<RestrictionDto?> CreateAsync(
        CreateRestrictionRequest request,
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (!ValidateRequest(request, out var error))
        {
            throw new InvalidOperationException(error);
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
        return Map(restriction);
    }

    public async Task<RestrictionDto?> UpdateAsync(
        int id,
        UpdateRestrictionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!ValidateRequest(request, out var error))
        {
            throw new InvalidOperationException(error);
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
        return Map(restriction);
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

    private static bool ValidateRequest(CreateRestrictionRequest request, out string error)
    {
        if (request.Condition == RestrictionCondition.Not)
        {
            error = "Condition 'Not' is not supported.";
            return false;
        }

        if (request.AttributeId is null && request.TagId is null)
        {
            error = "Either attributeId or tagId must be provided.";
            return false;
        }

        if (request.TagId.HasValue && request.Condition != RestrictionCondition.Exist)
        {
            error = "Tag restrictions only support the Exist condition.";
            return false;
        }

        if (request.AttributeId.HasValue
            && request.Condition is RestrictionCondition.Equal or RestrictionCondition.More or RestrictionCondition.Less
            && string.IsNullOrWhiteSpace(request.TargetValue))
        {
            error = "TargetValue is required for Equal, More, and Less conditions.";
            return false;
        }

        error = string.Empty;
        return true;
    }

    private static RestrictionDto Map(PositionRestriction restriction) => new()
    {
        Id = restriction.Id,
        PositionId = restriction.PositionId,
        AttributeId = restriction.AttributeId,
        TagId = restriction.TagId,
        TargetValue = restriction.TargetValue,
        Condition = restriction.Condition,
        CreatedAt = restriction.CreatedAt,
        CreatedById = restriction.CreatedById,
        Version = restriction.Version,
    };
}
