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

    Task<IReadOnlyList<PositionRestriction>> GetRestrictionsForPositionAsync(
        int positionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<T>> FilterByRestrictionsAsync<T>(
        IReadOnlyList<PositionRestriction> restrictions,
        IReadOnlyList<T> items,
        Func<T, string> candidateIdSelector,
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
    private sealed record CandidateRestrictionContext(
        IReadOnlyList<ProfileAttribute> ProfileAttributes,
        HashSet<int> TagIds);

    public Task<bool> HasAnyRestrictionsAsync(int positionId, CancellationToken cancellationToken = default) =>
        db.PositionRestrictions.AnyAsync(restriction => restriction.PositionId == positionId, cancellationToken);

    public async Task<bool> CandidateMeetsAllRestrictionsAsync(
        string candidateId,
        int positionId,
        CancellationToken cancellationToken = default)
    {
        var restrictions = await GetRestrictionsForPositionAsync(positionId, cancellationToken);
        if (restrictions.Count == 0)
        {
            return true;
        }

        var context = await LoadCandidateContextAsync(candidateId, cancellationToken);
        return CandidateMeetsAllRestrictions(restrictions, context);
    }

    public async Task<IReadOnlyList<PositionRestriction>> GetRestrictionsForPositionAsync(
        int positionId,
        CancellationToken cancellationToken = default) =>
        await LoadRestrictionsForPositionsAsync([positionId], cancellationToken);

    public async Task<IReadOnlyList<T>> FilterByRestrictionsAsync<T>(
        IReadOnlyList<PositionRestriction> restrictions,
        IReadOnlyList<T> items,
        Func<T, string> candidateIdSelector,
        CancellationToken cancellationToken = default)
    {
        if (items.Count == 0 || restrictions.Count == 0)
        {
            return items;
        }

        var candidateIds = items.Select(candidateIdSelector).Distinct().ToList();
        var contexts = await LoadCandidateContextsAsync(candidateIds, cancellationToken);

        return items
            .Where(item => CandidateMeetsAllRestrictions(
                restrictions,
                contexts[candidateIdSelector(item)]))
            .ToList();
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
        var ids = positionIds.ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        var restrictions = await LoadRestrictionsForPositionsAsync(ids, cancellationToken);
        if (restrictions.Count == 0)
        {
            return [..ids];
        }

        var restrictionsByPosition = restrictions
            .GroupBy(restriction => restriction.PositionId)
            .ToDictionary(group => group.Key, group => (IReadOnlyList<PositionRestriction>)group.ToList());

        var context = await LoadCandidateContextAsync(candidateId, cancellationToken);
        var visible = new HashSet<int>();

        foreach (var positionId in ids)
        {
            if (!restrictionsByPosition.TryGetValue(positionId, out var positionRestrictions)
                || CandidateMeetsAllRestrictions(positionRestrictions, context))
            {
                visible.Add(positionId);
            }
        }

        return visible;
    }

    private async Task<List<PositionRestriction>> LoadRestrictionsForPositionsAsync(
        IReadOnlyList<int> positionIds,
        CancellationToken cancellationToken)
    {
        if (positionIds.Count == 0)
        {
            return [];
        }

        return await db.PositionRestrictions
            .AsNoTracking()
            .Include(restriction => restriction.Attribute)
            .Where(restriction => positionIds.Contains(restriction.PositionId))
            .ToListAsync(cancellationToken);
    }

    private async Task<CandidateRestrictionContext> LoadCandidateContextAsync(
        string candidateId,
        CancellationToken cancellationToken)
    {
        var contexts = await LoadCandidateContextsAsync([candidateId], cancellationToken);
        return contexts[candidateId];
    }

    private async Task<IReadOnlyDictionary<string, CandidateRestrictionContext>> LoadCandidateContextsAsync(
        IReadOnlyList<string> candidateIds,
        CancellationToken cancellationToken)
    {
        if (candidateIds.Count == 0)
        {
            return new Dictionary<string, CandidateRestrictionContext>();
        }

        var profileAttributes = await db.ProfileAttributes
            .AsNoTracking()
            .Include(profileAttribute => profileAttribute.Attribute)
            .Where(profileAttribute => candidateIds.Contains(profileAttribute.CandidateId))
            .ToListAsync(cancellationToken);

        var tagIdsByCandidate = await db.ProfileProjectTags
            .AsNoTracking()
            .Where(projectTag => candidateIds.Contains(projectTag.ProfileProject.CandidateId))
            .Select(projectTag => new { projectTag.ProfileProject.CandidateId, projectTag.TagId })
            .ToListAsync(cancellationToken);

        var tagsByCandidate = tagIdsByCandidate
            .GroupBy(item => item.CandidateId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(item => item.TagId).ToHashSet());

        return candidateIds.ToDictionary(
            candidateId => candidateId,
            candidateId => new CandidateRestrictionContext(
                profileAttributes.Where(item => item.CandidateId == candidateId).ToList(),
                tagsByCandidate.GetValueOrDefault(candidateId) ?? []));
    }

    private bool CandidateMeetsAllRestrictions(
        IReadOnlyList<PositionRestriction> restrictions,
        CandidateRestrictionContext context)
    {
        foreach (var restriction in restrictions)
        {
            if (!EvaluateRestriction(restriction, context.ProfileAttributes, context.TagIds))
            {
                return false;
            }
        }

        return true;
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
