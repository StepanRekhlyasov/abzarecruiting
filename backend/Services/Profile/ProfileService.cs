using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Models.Profile;
using Backend.Api.Services.Attributes;
using Backend.Api.Services.Files;
using Microsoft.EntityFrameworkCore;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using FileEntity = Backend.Api.Data.Entities.File;

namespace Backend.Api.Services.Profile;

public interface IProfileService
{
    Task<ProfileDto?> GetByCandidateIdAsync(string candidateId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ProfileAttributeDto>?> GetMeInfoAsync(
        string candidateId,
        CancellationToken cancellationToken = default);

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

        var visibleAttributes = allAttributes
            .Where(attribute => defaultNames.Contains(attribute.Name) || profileAttributes.Any(item => item.AttributeId == attribute.Id))
            .ToList();

        var files = await LoadFilesForAttributesAsync(visibleAttributes, profileAttributes, cancellationToken);

        var attributeDtos = visibleAttributes
            .Select(attribute =>
            {
                var profileAttribute = profileAttributes.FirstOrDefault(item => item.AttributeId == attribute.Id);
                return MapAttribute(attribute, profileAttribute, defaultNames.Contains(attribute.Name), files);
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

    public async Task<IReadOnlyList<ProfileAttributeDto>?> GetMeInfoAsync(
        string candidateId,
        CancellationToken cancellationToken = default)
    {
        var userExists = await db.Users.AsNoTracking().AnyAsync(item => item.Id == candidateId, cancellationToken);
        if (!userExists)
        {
            return null;
        }

        var isCandidate = await (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where userRole.UserId == candidateId && role.Name == Roles.Candidate
            select role.Id
        ).AnyAsync(cancellationToken);

        if (!isCandidate)
        {
            throw new InvalidOperationException("error.profile.notCandidate");
        }

        var defaultNames = DefaultAttributes.All.Select(item => item.Name).ToHashSet();
        var attributes = await db.Attributes
            .AsNoTracking()
            .Include(attribute => attribute.Options)
            .ToListAsync(cancellationToken);

        var attributesByName = attributes
            .Where(attribute => defaultNames.Contains(attribute.Name))
            .ToDictionary(attribute => attribute.Name, StringComparer.Ordinal);
        var profileAttributes = await db.ProfileAttributes
            .AsNoTracking()
            .Where(item => item.CandidateId == candidateId)
            .ToListAsync(cancellationToken);
        var profileAttributesById = profileAttributes.ToDictionary(item => item.AttributeId);

        var defaultAttributes = DefaultAttributes.All
            .Select(definition => attributesByName.GetValueOrDefault(definition.Name))
            .Where(attribute => attribute is not null)
            .Cast<AttributeEntity>()
            .ToList();

        var addedAttributes = attributes
            .Where(attribute =>
                !defaultNames.Contains(attribute.Name) &&
                profileAttributesById.ContainsKey(attribute.Id))
            .OrderBy(attribute => attribute.Name)
            .ToList();

        var visibleAttributes = defaultAttributes.Concat(addedAttributes).ToList();
        var files = await LoadFilesForAttributesAsync(visibleAttributes, profileAttributes, cancellationToken);

        var defaultDtos = defaultAttributes
            .Select(attribute =>
            {
                profileAttributesById.TryGetValue(attribute.Id, out var profileAttribute);
                return MapAttribute(attribute, profileAttribute, isDefault: true, files);
            });

        var addedDtos = addedAttributes
            .Select(attribute =>
            {
                profileAttributesById.TryGetValue(attribute.Id, out var profileAttribute);
                return MapAttribute(attribute, profileAttribute, isDefault: false, files);
            });

        return defaultDtos.Concat(addedDtos).ToList();
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

    private ProfileAttributeDto MapAttribute(
        AttributeEntity attribute,
        ProfileAttribute? profileAttribute,
        bool isDefault,
        IReadOnlyDictionary<Guid, FileEntity> files)
    {
        var storedValue = profileAttribute is null
            ? null
            : valueMapper.GetComparableValue(profileAttribute, attribute);

        return new ProfileAttributeDto
        {
            Id = attribute.Id,
            Name = attribute.Name,
            Description = attribute.Description,
            Category = attribute.Category,
            ValueType = attribute.ValueType,
            InputType = attribute.InputType,
            Options = attribute.Options
                .OrderBy(option => option.Id)
                .Select(option => option.InputOption)
                .ToList(),
            Value = FileAttributeValueResolver.ToDisplayValue(attribute.ValueType, storedValue, files),
            Version = profileAttribute?.Version ?? 0,
            IsDefault = isDefault,
        };
    }

    private async Task<IReadOnlyDictionary<Guid, FileEntity>> LoadFilesForAttributesAsync(
        IEnumerable<AttributeEntity> attributes,
        IReadOnlyList<ProfileAttribute> profileAttributes,
        CancellationToken cancellationToken)
    {
        var profileAttributesById = profileAttributes.ToDictionary(item => item.AttributeId);
        var storedValues = attributes
            .Where(attribute => FileAttributeValueResolver.IsFileValueType(attribute.ValueType))
            .Select(attribute =>
            {
                profileAttributesById.TryGetValue(attribute.Id, out var profileAttribute);
                return profileAttribute is null
                    ? null
                    : valueMapper.GetComparableValue(profileAttribute, attribute);
            });

        return await FileAttributeValueResolver.LoadFilesAsync(db, storedValues, cancellationToken);
    }
}
