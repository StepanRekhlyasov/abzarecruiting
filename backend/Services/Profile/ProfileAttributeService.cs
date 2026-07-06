using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Profile;

public interface IProfileAttributeService
{
    Task SetStringValuesAsync(string candidateId, IReadOnlyDictionary<string, string> values);

    Task<IReadOnlyDictionary<string, string?>> GetStringValuesAsync(
        string candidateId,
        params string[] attributeNames);
}

public class ProfileAttributeService(ApplicationDbContext db) : IProfileAttributeService
{
    public async Task SetStringValuesAsync(string candidateId, IReadOnlyDictionary<string, string> values)
    {
        if (values.Count == 0)
        {
            return;
        }

        var attributeNames = values.Keys.ToHashSet(StringComparer.Ordinal);

        var attributeRows = await db.Attributes
            .Select(attribute => new { attribute.Id, attribute.Name })
            .ToListAsync();

        var attributes = attributeRows
            .Where(attribute => attributeNames.Contains(attribute.Name))
            .ToDictionary(attribute => attribute.Name, attribute => attribute.Id);

        var existing = await db.ProfileAttributes
            .Where(profileAttribute => profileAttribute.CandidateId == candidateId)
            .ToDictionaryAsync(
                profileAttribute => profileAttribute.AttributeId,
                profileAttribute => profileAttribute);

        foreach (var (name, value) in values)
        {
            if (!attributes.TryGetValue(name, out var attributeId))
            {
                throw new InvalidOperationException($"Attribute '{name}' was not found.");
            }

            if (existing.TryGetValue(attributeId, out var profileAttribute))
            {
                profileAttribute.ValueString = value;
                continue;
            }

            db.ProfileAttributes.Add(new ProfileAttribute
            {
                CandidateId = candidateId,
                AttributeId = attributeId,
                ValueString = value,
            });
        }

        await db.SaveChangesAsync();
    }

    public async Task<IReadOnlyDictionary<string, string?>> GetStringValuesAsync(
        string candidateId,
        params string[] attributeNames)
    {
        var names = attributeNames.ToHashSet(StringComparer.Ordinal);

        var rows = await db.ProfileAttributes
            .Where(profileAttribute => profileAttribute.CandidateId == candidateId)
            .Select(profileAttribute => new
            {
                profileAttribute.Attribute.Name,
                profileAttribute.ValueString,
            })
            .ToListAsync();

        return rows
            .Where(item => names.Contains(item.Name))
            .ToDictionary(item => item.Name, item => item.ValueString);
    }
}
