using System.Globalization;
using System.Linq.Expressions;
using Backend.Api.Data;
using Backend.Api.Data.Entities;
using Backend.Api.Data.Enums;
using Backend.Api.Data.Relations;
using Backend.Api.Services.Attributes;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Position;

public sealed record CandidateRestrictionContext(
    IReadOnlyList<ProfileAttribute> ProfileAttributes,
    HashSet<int> TagIds);

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

    IReadOnlyList<T> FilterByRestrictions<T>(
        IReadOnlyList<PositionRestriction> restrictions,
        IReadOnlyList<T> items,
        Func<T, string> candidateIdSelector,
        IReadOnlyDictionary<string, CandidateRestrictionContext> contexts);

    Task<IReadOnlyDictionary<string, CandidateRestrictionContext>> LoadCandidateContextsAsync(
        IReadOnlyList<string> candidateIds,
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

        return FilterByRestrictions(restrictions, items, candidateIdSelector, contexts);
    }

    public IReadOnlyList<T> FilterByRestrictions<T>(
        IReadOnlyList<PositionRestriction> restrictions,
        IReadOnlyList<T> items,
        Func<T, string> candidateIdSelector,
        IReadOnlyDictionary<string, CandidateRestrictionContext> contexts)
    {
        if (items.Count == 0 || restrictions.Count == 0)
        {
            return items;
        }

        return items
            .Where(item => CandidateMeetsAllRestrictions(
                restrictions,
                contexts[candidateIdSelector(item)]))
            .ToList();
    }

    public async Task<IReadOnlyDictionary<string, CandidateRestrictionContext>> LoadCandidateContextsAsync(
        IReadOnlyList<string> candidateIds,
        CancellationToken cancellationToken = default)
    {
        var ids = candidateIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<string, CandidateRestrictionContext>();
        }

        List<ProfileAttribute> profileAttributes;
        List<(string CandidateId, int TagId)> tagIdsByCandidate;

        if (ids.Count == 1)
        {
            var candidateId = ids[0];

            profileAttributes = await db.ProfileAttributes
                .AsNoTracking()
                .Include(profileAttribute => profileAttribute.Attribute)
                .Where(profileAttribute => profileAttribute.CandidateId == candidateId)
                .ToListAsync(cancellationToken);

            tagIdsByCandidate = await (
                from projectTag in db.ProfileProjectTags.AsNoTracking()
                join project in db.ProfileProjects.AsNoTracking()
                    on projectTag.ProfileProjectId equals project.Id
                where project.CandidateId == candidateId
                select new ValueTuple<string, int>(project.CandidateId, projectTag.TagId)
            ).ToListAsync(cancellationToken);
        }
        else
        {
            // Avoid Contains(string[]) / EF.Constant — MySQL EF fails type mapping for collection IN (@ids).
            profileAttributes = await db.ProfileAttributes
                .AsNoTracking()
                .Include(profileAttribute => profileAttribute.Attribute)
                .Where(BuildProfileAttributeCandidateIdEqualsAny(ids))
                .ToListAsync(cancellationToken);

            var projects = await db.ProfileProjects
                .AsNoTracking()
                .Include(project => project.ProfileProjectTags)
                .Where(BuildProfileProjectCandidateIdEqualsAny(ids))
                .ToListAsync(cancellationToken);

            tagIdsByCandidate = projects
                .SelectMany(project => project.ProfileProjectTags.Select(tag => (project.CandidateId, tag.TagId)))
                .ToList();
        }

        var tagsByCandidate = tagIdsByCandidate
            .GroupBy(item => item.CandidateId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(item => item.TagId).ToHashSet());

        return ids.ToDictionary(
            candidateId => candidateId,
            candidateId => new CandidateRestrictionContext(
                profileAttributes.Where(item => item.CandidateId == candidateId).ToList(),
                tagsByCandidate.GetValueOrDefault(candidateId) ?? []));
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

    private bool CandidateMeetsAllRestrictions(
        IReadOnlyList<PositionRestriction> restrictions,
        CandidateRestrictionContext context)
    {
        if (restrictions.Count == 0)
        {
            return true;
        }

        // Multiple conditions on the same attribute/tag are OR; different targets remain AND.
        foreach (var group in restrictions
                     .Where(restriction => restriction.AttributeId.HasValue)
                     .GroupBy(restriction => restriction.AttributeId!.Value))
        {
            if (!group.Any(restriction =>
                    EvaluateRestriction(restriction, context.ProfileAttributes, context.TagIds)))
            {
                return false;
            }
        }

        foreach (var group in restrictions
                     .Where(restriction => restriction.TagId.HasValue)
                     .GroupBy(restriction => restriction.TagId!.Value))
        {
            if (!group.Any(restriction =>
                    EvaluateRestriction(restriction, context.ProfileAttributes, context.TagIds)))
            {
                return false;
            }
        }

        return restrictions
            .Where(restriction => !restriction.AttributeId.HasValue && !restriction.TagId.HasValue)
            .All(restriction =>
                EvaluateRestriction(restriction, context.ProfileAttributes, context.TagIds));
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
        if (profileAttribute is null || attribute is null || string.IsNullOrWhiteSpace(targetValue))
        {
            return false;
        }

        var normalizedTarget = targetValue.Trim();

        return attribute.ValueType.ToLowerInvariant() switch
        {
            "number" => CompareNumeric(
                profileAttribute,
                attribute,
                normalizedTarget,
                (left, right) => left == right),
            "boolean" => CompareBoolean(profileAttribute, normalizedTarget),
            "date" => CompareDate(profileAttribute, normalizedTarget),
            _ => string.Equals(
                attributeValueMapper.GetComparableValue(profileAttribute, attribute)?.Trim(),
                normalizedTarget,
                StringComparison.OrdinalIgnoreCase),
        };
    }

    private static bool CompareBoolean(ProfileAttribute profileAttribute, string targetValue)
    {
        if (profileAttribute.ValueBoolean is null
            || !bool.TryParse(targetValue, out var expected))
        {
            return false;
        }

        return profileAttribute.ValueBoolean.Value == expected;
    }

    private static bool CompareDate(ProfileAttribute profileAttribute, string targetValue)
    {
        if (profileAttribute.ValueDate is null)
        {
            return false;
        }

        if (!DateTime.TryParse(
                targetValue,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var expected)
            && !DateTime.TryParse(targetValue, CultureInfo.CurrentCulture, DateTimeStyles.None, out expected))
        {
            return false;
        }

        return profileAttribute.ValueDate.Value.Date == expected.Date;
    }

    private bool CompareNumeric(
        ProfileAttribute? profileAttribute,
        Data.Entities.Attribute? attribute,
        string? targetValue,
        Func<decimal, decimal, bool> compare)
    {
        if (profileAttribute is null || attribute is null || string.IsNullOrWhiteSpace(targetValue))
        {
            return false;
        }

        decimal left;
        if (profileAttribute.ValueNumber is { } numberValue)
        {
            left = numberValue;
        }
        else if (!TryParseDecimal(
                     attributeValueMapper.GetComparableValue(profileAttribute, attribute),
                     out left))
        {
            return false;
        }

        if (!TryParseDecimal(targetValue, out var right))
        {
            return false;
        }

        return compare(left, right);
    }

    private static bool TryParseDecimal(string? value, out decimal result)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            result = default;
            return false;
        }

        return decimal.TryParse(value.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out result)
            || decimal.TryParse(value.Trim(), NumberStyles.Number, CultureInfo.CurrentCulture, out result);
    }

    private static Expression<Func<ProfileAttribute, bool>> BuildProfileAttributeCandidateIdEqualsAny(
        IReadOnlyList<string> ids) =>
        BuildStringEqualsAny<ProfileAttribute>(nameof(ProfileAttribute.CandidateId), ids);

    private static Expression<Func<ProfileProject, bool>> BuildProfileProjectCandidateIdEqualsAny(
        IReadOnlyList<string> ids) =>
        BuildStringEqualsAny<ProfileProject>(nameof(ProfileProject.CandidateId), ids);

    private static Expression<Func<T, bool>> BuildStringEqualsAny<T>(string propertyName, IReadOnlyList<string> ids)
    {
        var parameter = Expression.Parameter(typeof(T), "item");
        var property = Expression.Property(parameter, propertyName);

        Expression? body = null;
        foreach (var id in ids)
        {
            var equals = Expression.Equal(property, Expression.Constant(id, typeof(string)));
            body = body is null ? equals : Expression.OrElse(body, equals);
        }

        return Expression.Lambda<Func<T, bool>>(body!, parameter);
    }
}
