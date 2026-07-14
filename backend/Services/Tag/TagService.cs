using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Tag;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using TagEntity = Backend.Api.Data.Entities.Tag;

namespace Backend.Api.Services.Tag;

public interface ITagService
{
    Task<PagedResult<TagDto>> GetListAsync(TagListParams pagination, CancellationToken cancellationToken = default);

    Task<TagDto> CreateAsync(CreateTagRequest request, string userId, CancellationToken cancellationToken = default);

    Task<TagDto?> UpdateAsync(int id, UpdateTagRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default);
}

public class TagService(ApplicationDbContext db) : ITagService
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

        var searchPredicate = BuildIdOrSearchPredicate(ids, searchTerms);
        if (searchPredicate is not null)
        {
            query = query.Where(searchPredicate);
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
        return Map(tag);
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
        return true;
    }

    private static TagDto Map(TagEntity tag) => new()
    {
        Id = tag.Id,
        Name = tag.Name,
        CreatedAt = tag.CreatedAt,
        Version = tag.Version,
    };

    private static Expression<Func<TagEntity, bool>>? BuildIdOrSearchPredicate(
        IReadOnlyList<int> ids,
        IReadOnlyList<string> searchTerms)
    {
        if (ids.Count == 0 && searchTerms.Count == 0)
        {
            return null;
        }

        var parameter = Expression.Parameter(typeof(TagEntity), "tag");
        Expression? body = null;

        if (ids.Count > 0)
        {
            var idProperty = Expression.Property(parameter, nameof(TagEntity.Id));
            foreach (var id in ids)
            {
                var equals = Expression.Equal(idProperty, Expression.Constant(id));
                body = body is null ? equals : Expression.OrElse(body, equals);
            }
        }

        if (searchTerms.Count > 0)
        {
            var nameProperty = Expression.Property(parameter, nameof(TagEntity.Name));
            var containsMethod = typeof(string).GetMethod(nameof(string.Contains), [typeof(string)])!;

            foreach (var term in searchTerms)
            {
                var nameContains = Expression.Call(nameProperty, containsMethod, Expression.Constant(term));
                body = body is null ? nameContains : Expression.OrElse(body, nameContains);
            }
        }

        return Expression.Lambda<Func<TagEntity, bool>>(body!, parameter);
    }
}
