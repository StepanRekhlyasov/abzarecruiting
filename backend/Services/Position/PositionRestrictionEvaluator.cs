using Backend.Api.Data;
using Backend.Api.Data.Enums;
using Backend.Api.Data.Relations;
using Backend.Api.Services.Attributes;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Position;

public interface IPositionRestrictionEvaluator
{
    Task<bool> HasAnyRestrictionsAsync(int positionId, CancellationToken cancellationToken = default);

    Task<bool> CandidateMeetsAllRestrictionsAsync(
        string candidateId,
        int positionId,
        CancellationToken cancellationToken = default);

    Task<HashSet<int>> GetPositionIdsWithRestrictionsAsync(
        IEnumerable<int> positionIds,
        CancellationToken cancellationToken = default);

    Task<HashSet<int>> GetVisiblePositionIdsForCandidateAsync(
        string candidateId,
        IEnumerable<int> positionIds,
        CancellationToken cancellationToken = default);
}

public class PositionRestrictionEvaluator(
    ApplicationDbContext db,
    IAttributeValueMapper attributeValueMapper) : IPositionRestrictionEvaluator
{
    public Task<bool> HasAnyRestrictionsAsync(int positionId, CancellationToken cancellationToken = default) =>
        db.PositionRestrictions.AnyAsync(restriction => restriction.PositionId == positionId, cancellationToken);

    public async Task<bool> CandidateMeetsAllRestrictionsAsync(
        string candidateId,
        int positionId,
        CancellationToken cancellationToken = default)
    {
        var restrictions = await db.PositionRestrictions
            .AsNoTracking()
            .Include(restriction => restriction.Attribute)
            .Where(restriction => restriction.PositionId == positionId)
            .ToListAsync(cancellationToken);

        if (restrictions.Count == 0)
        {
            return true;
        }

        var profileAttributes = await db.ProfileAttributes
            .AsNoTracking()
            .Include(profileAttribute => profileAttribute.Attribute)
            .Where(profileAttribute => profileAttribute.CandidateId == candidateId)
            .ToListAsync(cancellationToken);

        var candidateTagIds = await db.ProfileProjectTags
            .AsNoTracking()
            .Where(projectTag => projectTag.ProfileProject.CandidateId == candidateId)
            .Select(projectTag => projectTag.TagId)
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var restriction in restrictions)
        {
            if (!EvaluateRestriction(restriction, profileAttributes, candidateTagIds))
            {
                return false;
            }
        }

        return true;
    }

    public async Task<HashSet<int>> GetPositionIdsWithRestrictionsAsync(
        IEnumerable<int> positionIds,
        CancellationToken cancellationToken = default)
    {
        var ids = positionIds.ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        return await db.PositionRestrictions
            .AsNoTracking()
            .Where(restriction => ids.Contains(restriction.PositionId))
            .Select(restriction => restriction.PositionId)
            .Distinct()
            .ToHashSetAsync(cancellationToken);
    }

    public async Task<HashSet<int>> GetVisiblePositionIdsForCandidateAsync(
        string candidateId,
        IEnumerable<int> positionIds,
        CancellationToken cancellationToken = default)
    {
        var visible = new HashSet<int>();
        foreach (var positionId in positionIds)
        {
            if (await CandidateMeetsAllRestrictionsAsync(candidateId, positionId, cancellationToken))
            {
                visible.Add(positionId);
            }
        }

        return visible;
    }

    private bool EvaluateRestriction(
        PositionRestriction restriction,
        IReadOnlyList<ProfileAttribute> profileAttributes,
        IReadOnlyCollection<int> candidateTagIds)
    {
        if (restriction.TagId.HasValue)
        {
            return restriction.Condition == RestrictionCondition.Exist
                && candidateTagIds.Contains(restriction.TagId.Value);
        }

        if (!restriction.AttributeId.HasValue)
        {
            return false;
        }

        var profileAttribute = profileAttributes
            .FirstOrDefault(item => item.AttributeId == restriction.AttributeId.Value);

        var attribute = restriction.Attribute
            ?? profileAttribute?.Attribute;

        if (attribute is null)
        {
            return false;
        }

        return restriction.Condition switch
        {
            RestrictionCondition.Exist => profileAttribute is not null
                && attributeValueMapper.HasValue(profileAttribute, attribute),
            RestrictionCondition.Equal => CompareEqual(profileAttribute, attribute, restriction.TargetValue),
            RestrictionCondition.More => CompareNumeric(profileAttribute, attribute, restriction.TargetValue, (left, right) => left > right),
            RestrictionCondition.Less => CompareNumeric(profileAttribute, attribute, restriction.TargetValue, (left, right) => left < right),
            _ => false,
        };
    }

    private bool CompareEqual(ProfileAttribute? profileAttribute, Data.Entities.Attribute? attribute, string? targetValue)
    {
        if (profileAttribute is null || attribute is null || targetValue is null)
        {
            return false;
        }

        var value = attributeValueMapper.GetComparableValue(profileAttribute, attribute);
        return value == targetValue;
    }

    private bool CompareNumeric(
        ProfileAttribute? profileAttribute,
        Data.Entities.Attribute? attribute,
        string? targetValue,
        Func<decimal, decimal, bool> compare)
    {
        if (profileAttribute is null || attribute is null || targetValue is null)
        {
            return false;
        }

        var value = attributeValueMapper.GetComparableValue(profileAttribute, attribute);
        if (!decimal.TryParse(value, out var left) || !decimal.TryParse(targetValue, out var right))
        {
            return false;
        }

        return compare(left, right);
    }
}
