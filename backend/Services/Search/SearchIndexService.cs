using System.Text;
using Backend.Api.Data;
using Backend.Api.Data.Entities;
using Backend.Api.Data.Relations;
using Backend.Api.Services.Attributes;
using Microsoft.EntityFrameworkCore;
using PositionEntity = Backend.Api.Data.Entities.Position;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using TagEntity = Backend.Api.Data.Entities.Tag;
using ResumeEntity = Backend.Api.Data.Entities.Resume;

namespace Backend.Api.Services.Search;

public interface ISearchIndexService
{
    Task RebuildResumeAsync(int resumeId, CancellationToken cancellationToken = default);

    Task RebuildResumesAsync(IEnumerable<int> resumeIds, CancellationToken cancellationToken = default);

    Task RebuildResumesForCandidateAsync(string candidateId, CancellationToken cancellationToken = default);

    Task RebuildResumesForCandidatesAsync(
        IEnumerable<string> candidateIds,
        CancellationToken cancellationToken = default);

    Task RebuildResumesForPositionAsync(int positionId, CancellationToken cancellationToken = default);

    Task RebuildPositionAsync(int positionId, CancellationToken cancellationToken = default);

    Task RebuildPositionsAsync(IEnumerable<int> positionIds, CancellationToken cancellationToken = default);

    Task RebuildProjectAsync(int projectId, CancellationToken cancellationToken = default);

    Task RebuildProjectsAsync(IEnumerable<int> projectIds, CancellationToken cancellationToken = default);

    Task RebuildAttributeAsync(int attributeId, CancellationToken cancellationToken = default);

    Task RebuildAttributesAsync(IEnumerable<int> attributeIds, CancellationToken cancellationToken = default);

    Task RebuildTagAsync(int tagId, CancellationToken cancellationToken = default);

    Task RebuildTagsAsync(IEnumerable<int> tagIds, CancellationToken cancellationToken = default);

    void DeleteResumes(IEnumerable<int> resumeIds);

    void DeletePositions(IEnumerable<int> positionIds);

    void DeleteProjects(IEnumerable<int> projectIds);

    void DeleteAttributes(IEnumerable<int> attributeIds);

    void DeleteTags(IEnumerable<int> tagIds);

    Task RebuildAllAsync(CancellationToken cancellationToken = default);
}

public class SearchIndexService(
    ApplicationDbContext db,
    IAttributeValueMapper valueMapper,
    ILuceneIndex lucene) : ISearchIndexService
{
    private static readonly HashSet<string> NonTextValueTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image",
        "file",
    };

    public Task RebuildResumeAsync(int resumeId, CancellationToken cancellationToken = default) =>
        RebuildResumesAsync([resumeId], cancellationToken);

    public async Task RebuildResumesAsync(
        IEnumerable<int> resumeIds,
        CancellationToken cancellationToken = default)
    {
        var uniqueIds = resumeIds.Where(id => id > 0).Distinct().ToList();
        if (uniqueIds.Count == 0)
        {
            return;
        }

        var resumes = await db.Resumes
            .AsNoTracking()
            .Include(item => item.Position)
            .Where(LuceneQueryExtensions.BuildIdEqualsAny<ResumeEntity>(uniqueIds, item => item.Id))
            .ToListAsync(cancellationToken);

        if (resumes.Count == 0)
        {
            return;
        }

        var candidateIds = resumes.Select(item => item.CandidateId).Distinct().ToList();
        var profileByCandidate = await LoadProfileAttributesByCandidateAsync(candidateIds, cancellationToken);
        var projectsByCandidate = await LoadProjectsByCandidateAsync(candidateIds, cancellationToken);

        var documents = resumes.Select(resume => (
            resume.Id,
            BuildResumeDocument(
                resume.CandidateId,
                resume.Position,
                profileByCandidate.GetValueOrDefault(resume.CandidateId, []),
                projectsByCandidate.GetValueOrDefault(resume.CandidateId, []))));

        lucene.UpsertMany(SearchEntityTypes.Resume, documents);
    }

    public Task RebuildResumesForCandidateAsync(
        string candidateId,
        CancellationToken cancellationToken = default) =>
        RebuildResumesForCandidatesAsync([candidateId], cancellationToken);

    public async Task RebuildResumesForCandidatesAsync(
        IEnumerable<string> candidateIds,
        CancellationToken cancellationToken = default)
    {
        var uniqueCandidateIds = candidateIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (uniqueCandidateIds.Count == 0)
        {
            return;
        }

        var resumeIds = await db.Resumes
            .AsNoTracking()
            .Where(LuceneQueryExtensions.BuildStringEqualsAny<ResumeEntity>(
                uniqueCandidateIds,
                item => item.CandidateId))
            .Select(item => item.Id)
            .ToListAsync(cancellationToken);

        await RebuildResumesAsync(resumeIds, cancellationToken);
    }

    public async Task RebuildResumesForPositionAsync(
        int positionId,
        CancellationToken cancellationToken = default)
    {
        var resumeIds = await db.Resumes
            .AsNoTracking()
            .Where(item => item.PositionId == positionId)
            .Select(item => item.Id)
            .ToListAsync(cancellationToken);

        await RebuildResumesAsync(resumeIds, cancellationToken);
    }

    public Task RebuildPositionAsync(int positionId, CancellationToken cancellationToken = default) =>
        RebuildPositionsAsync([positionId], cancellationToken);

    public async Task RebuildPositionsAsync(
        IEnumerable<int> positionIds,
        CancellationToken cancellationToken = default)
    {
        var uniqueIds = positionIds.Where(id => id > 0).Distinct().ToList();
        if (uniqueIds.Count == 0)
        {
            return;
        }

        var positions = await db.Positions
            .AsNoTracking()
            .Where(LuceneQueryExtensions.BuildIdEqualsAny<PositionEntity>(uniqueIds, item => item.Id))
            .ToListAsync(cancellationToken);

        lucene.UpsertMany(
            SearchEntityTypes.Position,
            positions.Select(position => (
                position.Id,
                JoinParts(
                    position.Name,
                    position.Company,
                    position.Country,
                    position.Description,
                    position.Level.ToString(),
                    position.Format.ToString()))));
    }

    public Task RebuildProjectAsync(int projectId, CancellationToken cancellationToken = default) =>
        RebuildProjectsAsync([projectId], cancellationToken);

    public async Task RebuildProjectsAsync(
        IEnumerable<int> projectIds,
        CancellationToken cancellationToken = default)
    {
        var uniqueIds = projectIds.Where(id => id > 0).Distinct().ToList();
        if (uniqueIds.Count == 0)
        {
            return;
        }

        var projects = await db.ProfileProjects
            .AsNoTracking()
            .Include(item => item.ProfileProjectTags)
            .ThenInclude(item => item.Tag)
            .Where(LuceneQueryExtensions.BuildIdEqualsAny<ProfileProject>(uniqueIds, item => item.Id))
            .ToListAsync(cancellationToken);

        lucene.UpsertMany(
            SearchEntityTypes.Project,
            projects.Select(project => (
                project.Id,
                JoinParts(
                    new[] { project.Name, project.Description }
                        .Concat(project.ProfileProjectTags.Select(item => item.Tag.Name))
                        .ToArray()))));
    }

    public Task RebuildAttributeAsync(int attributeId, CancellationToken cancellationToken = default) =>
        RebuildAttributesAsync([attributeId], cancellationToken);

    public async Task RebuildAttributesAsync(
        IEnumerable<int> attributeIds,
        CancellationToken cancellationToken = default)
    {
        var uniqueIds = attributeIds.Where(id => id > 0).Distinct().ToList();
        if (uniqueIds.Count == 0)
        {
            return;
        }

        var attributes = await db.Attributes
            .AsNoTracking()
            .Include(item => item.Options)
            .Where(LuceneQueryExtensions.BuildIdEqualsAny<AttributeEntity>(uniqueIds, item => item.Id))
            .ToListAsync(cancellationToken);

        lucene.UpsertMany(
            SearchEntityTypes.Attribute,
            attributes.Select(attribute => (
                attribute.Id,
                JoinParts(
                    new[]
                    {
                        attribute.Name,
                        attribute.Description,
                        AttributeCategories.ToSearchLabel(attribute.Category),
                    }
                        .Concat(attribute.Options.Select(option => option.InputOption))
                        .ToArray()))));
    }

    public Task RebuildTagAsync(int tagId, CancellationToken cancellationToken = default) =>
        RebuildTagsAsync([tagId], cancellationToken);

    public async Task RebuildTagsAsync(
        IEnumerable<int> tagIds,
        CancellationToken cancellationToken = default)
    {
        var uniqueIds = tagIds.Where(id => id > 0).Distinct().ToList();
        if (uniqueIds.Count == 0)
        {
            return;
        }

        var tags = await db.Tags
            .AsNoTracking()
            .Where(LuceneQueryExtensions.BuildIdEqualsAny<TagEntity>(uniqueIds, item => item.Id))
            .ToListAsync(cancellationToken);

        lucene.UpsertMany(
            SearchEntityTypes.Tag,
            tags.Select(tag => (tag.Id, JoinParts(tag.Name))));
    }

    public void DeleteResumes(IEnumerable<int> resumeIds) =>
        lucene.DeleteMany(SearchEntityTypes.Resume, resumeIds);

    public void DeletePositions(IEnumerable<int> positionIds) =>
        lucene.DeleteMany(SearchEntityTypes.Position, positionIds);

    public void DeleteProjects(IEnumerable<int> projectIds) =>
        lucene.DeleteMany(SearchEntityTypes.Project, projectIds);

    public void DeleteAttributes(IEnumerable<int> attributeIds) =>
        lucene.DeleteMany(SearchEntityTypes.Attribute, attributeIds);

    public void DeleteTags(IEnumerable<int> tagIds) =>
        lucene.DeleteMany(SearchEntityTypes.Tag, tagIds);

    public async Task RebuildAllAsync(CancellationToken cancellationToken = default)
    {
        lucene.Clear();

        var positionIds = await db.Positions.AsNoTracking().Select(item => item.Id).ToListAsync(cancellationToken);
        await RebuildPositionsAsync(positionIds, cancellationToken);

        var attributeIds = await db.Attributes.AsNoTracking().Select(item => item.Id).ToListAsync(cancellationToken);
        await RebuildAttributesAsync(attributeIds, cancellationToken);

        var tagIds = await db.Tags.AsNoTracking().Select(item => item.Id).ToListAsync(cancellationToken);
        await RebuildTagsAsync(tagIds, cancellationToken);

        var projectIds = await db.ProfileProjects.AsNoTracking().Select(item => item.Id).ToListAsync(cancellationToken);
        await RebuildProjectsAsync(projectIds, cancellationToken);

        var resumeIds = await db.Resumes.AsNoTracking().Select(item => item.Id).ToListAsync(cancellationToken);
        await RebuildResumesAsync(resumeIds, cancellationToken);
    }

    private async Task<Dictionary<string, List<ProfileAttribute>>> LoadProfileAttributesByCandidateAsync(
        IReadOnlyList<string> candidateIds,
        CancellationToken cancellationToken)
    {
        if (candidateIds.Count == 0)
        {
            return [];
        }

        var rows = await db.ProfileAttributes
            .AsNoTracking()
            .Include(item => item.Attribute)
            .Where(LuceneQueryExtensions.BuildStringEqualsAny<ProfileAttribute>(
                candidateIds,
                item => item.CandidateId))
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(item => item.CandidateId)
            .ToDictionary(group => group.Key, group => group.ToList());
    }

    private async Task<Dictionary<string, List<ProfileProject>>> LoadProjectsByCandidateAsync(
        IReadOnlyList<string> candidateIds,
        CancellationToken cancellationToken)
    {
        if (candidateIds.Count == 0)
        {
            return [];
        }

        var rows = await db.ProfileProjects
            .AsNoTracking()
            .Include(item => item.ProfileProjectTags)
            .ThenInclude(item => item.Tag)
            .Where(LuceneQueryExtensions.BuildStringEqualsAny<ProfileProject>(
                candidateIds,
                item => item.CandidateId))
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(item => item.CandidateId)
            .ToDictionary(group => group.Key, group => group.ToList());
    }

    private string BuildResumeDocument(
        string candidateId,
        PositionEntity position,
        IReadOnlyList<ProfileAttribute> profileAttributes,
        IReadOnlyList<ProfileProject> projects)
    {
        var parts = new List<string?>
        {
            position.Name,
            position.Company,
            position.Country,
            position.Description,
            position.Level.ToString(),
            position.Format.ToString(),
            candidateId,
        };

        foreach (var profileAttribute in profileAttributes)
        {
            parts.Add(profileAttribute.Attribute.Name);
            parts.Add(AttributeCategories.ToSearchLabel(profileAttribute.Attribute.Category));

            if (NonTextValueTypes.Contains(profileAttribute.Attribute.ValueType))
            {
                continue;
            }

            parts.Add(valueMapper.GetComparableValue(profileAttribute, profileAttribute.Attribute));
        }

        foreach (var project in projects)
        {
            parts.Add(project.Name);
            parts.Add(project.Description);
            parts.AddRange(project.ProfileProjectTags.Select(item => item.Tag.Name));
        }

        return JoinParts(parts.ToArray());
    }

    private static string JoinParts(params string?[] parts)
    {
        var builder = new StringBuilder();
        foreach (var part in parts)
        {
            if (string.IsNullOrWhiteSpace(part))
            {
                continue;
            }

            if (builder.Length > 0)
            {
                builder.Append(' ');
            }

            builder.Append(part.Trim());
        }

        return builder.ToString();
    }
}
