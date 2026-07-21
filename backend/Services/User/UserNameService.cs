using Backend.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.User;

public interface IUserNameService
{
    Task<Dictionary<string, string>> GetFullNameMapAsync(
        IReadOnlyList<string> userIds,
        CancellationToken cancellationToken = default);

    Task<Dictionary<string, (string FirstName, string LastName)>> GetNamePartsMapAsync(
        IReadOnlyList<string> userIds,
        CancellationToken cancellationToken = default);

    static string JoinName(string? firstName, string? lastName) =>
        string.Join(
            ' ',
            new[] { firstName?.Trim() ?? string.Empty, lastName?.Trim() ?? string.Empty }
                .Where(part => !string.IsNullOrWhiteSpace(part)));
}

public class UserNameService(ApplicationDbContext db) : IUserNameService
{
    public async Task<Dictionary<string, string>> GetFullNameMapAsync(
        IReadOnlyList<string> userIds,
        CancellationToken cancellationToken = default)
    {
        var partsMap = await GetNamePartsMapAsync(userIds, cancellationToken);
        return partsMap.ToDictionary(
            pair => pair.Key,
            pair => IUserNameService.JoinName(pair.Value.FirstName, pair.Value.LastName),
            StringComparer.Ordinal);
    }

    public async Task<Dictionary<string, (string FirstName, string LastName)>> GetNamePartsMapAsync(
        IReadOnlyList<string> userIds,
        CancellationToken cancellationToken = default)
    {
        if (userIds.Count == 0)
        {
            return new Dictionary<string, (string FirstName, string LastName)>(StringComparer.Ordinal);
        }

        var userIdSet = userIds.ToHashSet(StringComparer.Ordinal);

        var nameAttributeIds = await db.Attributes
            .AsNoTracking()
            .Where(attribute =>
                attribute.Name == DefaultAttributes.FirstName || attribute.Name == DefaultAttributes.LastName)
            .Select(attribute => new { attribute.Id, attribute.Name })
            .ToListAsync(cancellationToken);

        var firstNameId = nameAttributeIds.FirstOrDefault(item => item.Name == DefaultAttributes.FirstName)?.Id;
        var lastNameId = nameAttributeIds.FirstOrDefault(item => item.Name == DefaultAttributes.LastName)?.Id;

        var profileAttributes = await db.ProfileAttributes
            .AsNoTracking()
            .Where(profileAttribute =>
                (firstNameId.HasValue && profileAttribute.AttributeId == firstNameId.Value)
                || (lastNameId.HasValue && profileAttribute.AttributeId == lastNameId.Value))
            .Select(profileAttribute => new
            {
                profileAttribute.CandidateId,
                profileAttribute.AttributeId,
                profileAttribute.ValueString,
            })
            .ToListAsync(cancellationToken);

        var relevantAttributes = profileAttributes
            .Where(item => userIdSet.Contains(item.CandidateId))
            .ToList();

        return userIds.Distinct(StringComparer.Ordinal).ToDictionary(
            userId => userId,
            userId =>
            {
                var firstName = firstNameId.HasValue
                    ? relevantAttributes
                        .FirstOrDefault(item => item.CandidateId == userId && item.AttributeId == firstNameId.Value)
                        ?.ValueString
                        ?.Trim()
                        ?? string.Empty
                    : string.Empty;
                var lastName = lastNameId.HasValue
                    ? relevantAttributes
                        .FirstOrDefault(item => item.CandidateId == userId && item.AttributeId == lastNameId.Value)
                        ?.ValueString
                        ?.Trim()
                        ?? string.Empty
                    : string.Empty;

                return (firstName, lastName);
            },
            StringComparer.Ordinal);
    }
}
