using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Services.Attributes;
using Microsoft.EntityFrameworkCore;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Services.Profile;

public interface IProfileAttributeService
{
    Task SetStringValuesAsync(string candidateId, IReadOnlyDictionary<string, string> values);

    Task<IReadOnlyDictionary<string, string?>> GetStringValuesAsync(
        string candidateId,
        params string[] attributeNames);
}

public class ProfileAttributeService(
    ApplicationDbContext db,
    IAttributeValueMapper valueMapper) : IProfileAttributeService
{
    public async Task SetStringValuesAsync(string candidateId, IReadOnlyDictionary<string, string> values)
    {
        if (values.Count == 0)
        {
            return;
        }

        var attributeNames = values.Keys.ToHashSet(StringComparer.Ordinal);

        var attributeRows = await db.Attributes.ToListAsync();
        var attributes = attributeRows
            .Where(attribute => attributeNames.Contains(attribute.Name))
            .ToDictionary(attribute => attribute.Name, StringComparer.Ordinal);

        var existing = await db.ProfileAttributes
            .Where(profileAttribute => profileAttribute.CandidateId == candidateId)
            .ToDictionaryAsync(
                profileAttribute => profileAttribute.AttributeId,
                profileAttribute => profileAttribute);

        foreach (var (name, value) in values)
        {
            if (!attributes.TryGetValue(name, out var attribute))
            {
                throw new InvalidOperationException($"Attribute '{name}' was not found.");
            }

            if (existing.TryGetValue(attribute.Id, out var profileAttribute))
            {
                valueMapper.SetValue(profileAttribute, attribute, value);
                profileAttribute.Version++;
                continue;
            }

            profileAttribute = new ProfileAttribute
            {
                CandidateId = candidateId,
                AttributeId = attribute.Id,
                Version = 0,
            };
            valueMapper.SetValue(profileAttribute, attribute, value);
            db.ProfileAttributes.Add(profileAttribute);
        }

        await db.SaveChangesAsync();
    }

    public async Task<IReadOnlyDictionary<string, string?>> GetStringValuesAsync(
        string candidateId,
        params string[] attributeNames)
    {
        var names = attributeNames.ToHashSet(StringComparer.Ordinal);

        var rows = await db.ProfileAttributes
            .Include(profileAttribute => profileAttribute.Attribute)
            .Where(profileAttribute => profileAttribute.CandidateId == candidateId)
            .ToListAsync();

        return rows
            .Where(item => names.Contains(item.Attribute.Name))
            .ToDictionary(
                item => item.Attribute.Name,
                item => valueMapper.GetComparableValue(item, item.Attribute));
    }
}
