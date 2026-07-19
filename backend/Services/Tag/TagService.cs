using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Tag;
using Backend.Api.Services.Search;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using TagEntity = Backend.Api.Data.Entities.Tag;
using ProfileProjectEntity = Backend.Api.Data.Entities.ProfileProject;

namespace Backend.Api.Services.Tag;

public interface ITagService
{
    Task<PagedResult<TagDto>> GetListAsync(TagListParams pagination, CancellationToken cancellationToken = default);

    Task<TagDto> CreateAsync(CreateTagRequest request, string userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TagDto>> EnsureAsync(
        IEnumerable<string> names,
        string userId,
        CancellationToken cancellationToken = default);

    Task<TagDto?> UpdateAsync(int id, UpdateTagRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default);

    Task DeleteBatchAsync(IEnumerable<DeleteTagItem> items, CancellationToken cancellationToken = default);
}

public class TagService(ApplicationDbContext db, ISearchIndexService searchIndex, ILuceneIndex lucene) : ITagService
{
    private const string VersionChangedMessage = "error.oldVersion";

    public async Task<PagedResult<TagDto>> GetListAsync(
        TagListParams pagination,
        CancellationToken cancellationToken = default)
    {
        IQueryable<TagEntity> query = db.Tags.AsNoTracking();

        // Avoid Contains(collection) / .Any over in-memory lists — MySQL EF fails ValuesExpression type mapping.
        var ids = (pagination.Ids ?? [])
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        var searchTerms = (pagination.Searches ?? [])
            .Where(term => !string.IsNullOrWhiteSpace(term))
            .Select(term => term.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (searchTerms.Count == 0 && !string.IsNullOrWhiteSpace(pagination.Search))
        {
            searchTerms.Add(pagination.Search.Trim());
        }

        IReadOnlyList<int> fullTextIds = [];
        if (searchTerms.Count > 0)
        {
            fullTextIds = lucene.Search(SearchEntityTypes.Tag, string.Join(' ', searchTerms));
        }

        if (ids.Count > 0 || searchTerms.Count > 0)
        {
            var matchedIds = ids.Union(fullTextIds).Distinct().ToList();
            query = query.Where(LuceneQueryExtensions.BuildIdEqualsAny<TagEntity>(matchedIds, tag => tag.Id));
        }

        query = query.ApplySort(pagination, tag => tag.Name);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedSize)
            .Select(tag => Map(tag))
            .ToListAsync(cancellationToken);

        return new PagedResult<TagDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = pagination.NormalizedPage,
            Size = pagination.NormalizedSize,
        };
    }

    public async Task<TagDto> CreateAsync(
        CreateTagRequest request,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var tag = new TagEntity
        {
            Name = request.Name,
            CreatedAt = DateTime.UtcNow,
            CreatedById = userId,
        };

        db.Tags.Add(tag);
        await db.SaveChangesAsync(cancellationToken);
        await searchIndex.RebuildTagAsync(tag.Id, cancellationToken);
        return Map(tag);
    }

    public async Task<IReadOnlyList<TagDto>> EnsureAsync(
        IEnumerable<string> names,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var normalized = names
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalized.Count == 0)
        {
            return [];
        }

        var existingPredicate = BuildExactNamePredicate(normalized);
        var existing = await db.Tags
            .Where(existingPredicate)
            .ToListAsync(cancellationToken);

        var existingByName = existing.ToDictionary(tag => tag.Name, StringComparer.OrdinalIgnoreCase);
        var created = new List<TagEntity>();

        foreach (var name in normalized)
        {
            if (existingByName.ContainsKey(name))
            {
                continue;
            }

            var tag = new TagEntity
            {
                Name = name,
                CreatedAt = DateTime.UtcNow,
                CreatedById = userId,
            };
            db.Tags.Add(tag);
            created.Add(tag);
            existingByName[name] = tag;
        }

        if (created.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            await searchIndex.RebuildTagsAsync(created.Select(tag => tag.Id), cancellationToken);
        }

        return normalized
            .Select(name => Map(existingByName[name]))
            .ToList();
    }

    public async Task<TagDto?> UpdateAsync(
        int id,
        UpdateTagRequest request,
        CancellationToken cancellationToken = default)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (tag is null)
        {
            return null;
        }

        if (tag.Version != request.Version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }

        tag.Name = request.Name;
        tag.Version++;
        await db.SaveChangesAsync(cancellationToken);
        await searchIndex.RebuildTagAsync(id, cancellationToken);

        var projectIds = await db.ProfileProjectTags
            .AsNoTracking()
            .Where(item => item.TagId == id)
            .Select(item => item.ProfileProjectId)
            .Distinct()
            .ToListAsync(cancellationToken);

        await searchIndex.RebuildProjectsAsync(projectIds, cancellationToken);

        var candidateIds = await db.ProfileProjects
            .AsNoTracking()
            .Where(LuceneQueryExtensions.BuildIdEqualsAny<ProfileProjectEntity>(projectIds, project => project.Id))
            .Select(project => project.CandidateId)
            .Distinct()
            .ToListAsync(cancellationToken);

        await searchIndex.RebuildResumesForCandidatesAsync(candidateIds, cancellationToken);

        return Map(tag);
    }

    public async Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (tag is null)
        {
            return false;
        }

        if (tag.Version != version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }

        db.Tags.Remove(tag);
        await db.SaveChangesAsync(cancellationToken);
        searchIndex.DeleteTags([id]);
        return true;
    }

    public async Task DeleteBatchAsync(IEnumerable<DeleteTagItem> items, CancellationToken cancellationToken = default)
    {
        var uniqueItems = items
            .GroupBy(item => item.Id)
            .Select(group => group.Last())
            .ToList();

        if (uniqueItems.Count == 0)
        {
            return;
        }

        var ids = uniqueItems.Select(item => item.Id).ToList();
        var tags = await db.Tags
            .Where(item => ids.Contains(item.Id))
            .ToListAsync(cancellationToken);

        if (tags.Count != ids.Count)
        {
            throw new InvalidOperationException("error.tags.notFound");
        }

        var versionById = uniqueItems.ToDictionary(item => item.Id, item => item.Version);

        foreach (var tag in tags)
        {
            if (tag.Version != versionById[tag.Id])
            {
                throw new InvalidOperationException(VersionChangedMessage);
            }
        }

        db.Tags.RemoveRange(tags);
        await db.SaveChangesAsync(cancellationToken);
        searchIndex.DeleteTags(ids);
    }

    private static TagDto Map(TagEntity tag) => new()
    {
        Id = tag.Id,
        Name = tag.Name,
        CreatedAt = tag.CreatedAt,
        Version = tag.Version,
    };

    private static Expression<Func<TagEntity, bool>> BuildExactNamePredicate(IReadOnlyList<string> names)
    {
        var parameter = Expression.Parameter(typeof(TagEntity), "tag");
        var nameProperty = Expression.Property(parameter, nameof(TagEntity.Name));
        Expression? body = null;

        foreach (var name in names)
        {
            var equals = Expression.Equal(nameProperty, Expression.Constant(name));
            body = body is null ? equals : Expression.OrElse(body, equals);
        }

        return Expression.Lambda<Func<TagEntity, bool>>(body!, parameter);
    }
}
