using Backend.Api.Data;
using Backend.Api.Models.Profile;
using Backend.Api.Services.Attributes;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Profile;

public interface IProfileService
{
    Task<ProfileDto?> GetByCandidateIdAsync(string candidateId, CancellationToken cancellationToken = default);
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

        var allAttributes = await db.Attributes.AsNoTracking().OrderBy(attribute => attribute.Name).ToListAsync(cancellationToken);
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
}
