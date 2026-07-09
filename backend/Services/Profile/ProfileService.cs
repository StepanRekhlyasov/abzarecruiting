using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Models.Profile;
using Backend.Api.Services.Attributes;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Profile;

public interface IProfileService
{
    Task<ProfileDto?> GetByCandidateIdAsync(string candidateId, CancellationToken cancellationToken = default);

    Task<bool> AddAttributesAsync(
        string candidateId,
        IEnumerable<int> attributeIds,
        CancellationToken cancellationToken = default);

    Task<bool> RemoveAttributesAsync(
        string candidateId,
        IEnumerable<int> attributeIds,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<int>> GetLinkedAttributeIdsAsync(
        string candidateId,
        CancellationToken cancellationToken = default);
}

public class ProfileService(ApplicationDbContext db, IAttributeValueMapper valueMapper) : IProfileService
{
    public async Task<ProfileDto?> GetByCandidateIdAsync(
        string candidateId,
        CancellationToken cancellationToken = default)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(item => item.Id == candidateId, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var allAttributes = await db.Attributes
            .AsNoTracking()
            .Include(attribute => attribute.Options)
            .OrderBy(attribute => attribute.Name)
            .ToListAsync(cancellationToken);
        var defaultNames = DefaultAttributes.All.Select(item => item.Name).ToHashSet();
        var profileAttributes = await db.ProfileAttributes
            .AsNoTracking()
            .Where(item => item.CandidateId == candidateId)
            .ToListAsync(cancellationToken);

        var attributeDtos = allAttributes
            .Where(attribute => defaultNames.Contains(attribute.Name) || profileAttributes.Any(item => item.AttributeId == attribute.Id))
            .Select(attribute =>
            {
                var profileAttribute = profileAttributes.FirstOrDefault(item => item.AttributeId == attribute.Id);
                return new ProfileAttributeDto
                {
                    Id = attribute.Id,
                    Name = attribute.Name,
                    ValueType = attribute.ValueType,
                    InputType = attribute.InputType,
                    Options = attribute.Options
                        .OrderBy(option => option.Id)
                        .Select(option => option.InputOption)
                        .ToList(),
                    Value = profileAttribute is null ? null : valueMapper.GetComparableValue(profileAttribute, attribute),
                };
            })
            .ToList();

        var projects = await db.ProfileProjects
            .AsNoTracking()
            .Where(project => project.CandidateId == candidateId)
            .Include(project => project.ProfileProjectTags)
            .ThenInclude(projectTag => projectTag.Tag)
            .OrderBy(project => project.Name)
            .ToListAsync(cancellationToken);

        return new ProfileDto
        {
            CandidateId = candidateId,
            Email = user.Email ?? string.Empty,
            Attributes = attributeDtos,
            Projects = projects.Select(project => new ProfileProjectDto
            {
                Id = project.Id,
                Name = project.Name,
                Description = project.Description,
                StartAt = project.StartAt,
                EndAt = project.EndAt,
                Tags = project.ProfileProjectTags
                    .Select(tag => new ProfileProjectTagDto { Id = tag.TagId, Name = tag.Tag.Name })
                    .OrderBy(tag => tag.Name)
                    .ToList(),
            }).ToList(),
        };
    }

    public async Task<bool> AddAttributesAsync(
        string candidateId,
        IEnumerable<int> attributeIds,
        CancellationToken cancellationToken = default)
    {
        var uniqueIds = attributeIds.Distinct().ToList();

        if (uniqueIds.Count == 0)
        {
            return true;
        }

        if (!await db.Users.AnyAsync(user => user.Id == candidateId, cancellationToken))
        {
            return false;
        }

        var attributes = await db.Attributes
            .Where(attribute => uniqueIds.Contains(attribute.Id))
            .ToListAsync(cancellationToken);

        if (attributes.Count != uniqueIds.Count)
        {
            throw new InvalidOperationException("error.attributes.notFound");
        }

        var existingAttributeIds = await db.ProfileAttributes
            .Where(item => item.CandidateId == candidateId && uniqueIds.Contains(item.AttributeId))
            .Select(item => item.AttributeId)
            .ToHashSetAsync(cancellationToken);

        foreach (var attribute in attributes)
        {
            if (existingAttributeIds.Contains(attribute.Id))
            {
                continue;
            }

            var profileAttribute = new ProfileAttribute
            {
                CandidateId = candidateId,
                AttributeId = attribute.Id,
            };

            valueMapper.SetValue(profileAttribute, attribute, string.Empty);
            db.ProfileAttributes.Add(profileAttribute);
        }

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RemoveAttributesAsync(
        string candidateId,
        IEnumerable<int> attributeIds,
        CancellationToken cancellationToken = default)
    {
        var uniqueIds = attributeIds.Distinct().ToList();

        if (uniqueIds.Count == 0)
        {
            return true;
        }

        if (!await db.Users.AnyAsync(user => user.Id == candidateId, cancellationToken))
        {
            return false;
        }

        var attributes = await db.Attributes
            .Where(attribute => uniqueIds.Contains(attribute.Id))
            .ToListAsync(cancellationToken);

        if (attributes.Count != uniqueIds.Count)
        {
            throw new InvalidOperationException("error.attributes.notFound");
        }

        if (attributes.Any(attribute => DefaultAttributes.IsDefaultName(attribute.Name)))
        {
            throw new InvalidOperationException("error.attributes.editDefault");
        }

        var profileAttributes = await db.ProfileAttributes
            .Where(item => item.CandidateId == candidateId && uniqueIds.Contains(item.AttributeId))
            .ToListAsync(cancellationToken);

        if (profileAttributes.Count == 0)
        {
            return true;
        }

        db.ProfileAttributes.RemoveRange(profileAttributes);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<int>> GetLinkedAttributeIdsAsync(
        string candidateId,
        CancellationToken cancellationToken = default)
    {
        if (!await db.Users.AnyAsync(user => user.Id == candidateId, cancellationToken))
        {
            return [];
        }

        return await db.ProfileAttributes
            .AsNoTracking()
            .Where(item => item.CandidateId == candidateId)
            .Select(item => item.AttributeId)
            .Distinct()
            .ToListAsync(cancellationToken);
    }
}
