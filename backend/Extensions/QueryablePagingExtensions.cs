using System.Linq.Expressions;
using Backend.Api.Models.Common;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Extensions;

public static class QueryablePagingExtensions
{
    public static IQueryable<T> WhereHasAllTagIds<T>(
        this IQueryable<T> query,
        IEnumerable<int> tagIds,
        Func<int, Expression<Func<T, bool>>> predicateFactory)
    {
        foreach (var tagId in tagIds)
        {
            query = query.Where(predicateFactory(tagId));
        }

        return query;
    }

    public static async Task<PagedResult<TResult>> ToPagedResultAsync<TSource, TResult>(
        this IQueryable<TSource> query,
        PaginationParams pagination,
        Expression<Func<TSource, TResult>> map,
        CancellationToken cancellationToken = default)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedSize)
            .Select(map)
            .ToListAsync(cancellationToken);

        return new PagedResult<TResult>
        {
            Items = items,
            TotalCount = totalCount,
            Page = pagination.NormalizedPage,
            Size = pagination.NormalizedSize,
        };
    }

    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query,
        PaginationParams pagination,
        CancellationToken cancellationToken = default)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<T>
        {
            Items = items,
            TotalCount = totalCount,
            Page = pagination.NormalizedPage,
            Size = pagination.NormalizedSize,
        };
    }

    public static PagedResult<T> ToPagedResult<T>(
        this IReadOnlyList<T> items,
        int totalCount,
        PaginationParams pagination) =>
        new()
        {
            Items = items,
            TotalCount = totalCount,
            Page = pagination.NormalizedPage,
            Size = pagination.NormalizedSize,
        };
}
