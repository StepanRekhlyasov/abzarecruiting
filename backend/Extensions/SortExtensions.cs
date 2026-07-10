using System.Linq.Expressions;
using System.Reflection;
using Backend.Api.Models.Common;

namespace Backend.Api.Extensions;

public static class SortExtensions
{
    public static IQueryable<T> ApplySort<T>(
        this IQueryable<T> source,
        PaginationParams pagination,
        Expression<Func<T, object>> defaultKey)
    {
        var selector = ResolveKeySelector(pagination.NormalizedSortBy, defaultKey);

        return pagination.IsDescending
            ? source.OrderByDescending(selector)
            : source.OrderBy(selector);
    }

    private static Expression<Func<T, object>> ResolveKeySelector<T>(
        string? sortBy,
        Expression<Func<T, object>> defaultKey)
    {
        if (string.IsNullOrEmpty(sortBy))
        {
            return defaultKey;
        }

        var property = typeof(T).GetProperty(
            sortBy,
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

        if (property is null)
        {
            return defaultKey;
        }

        var parameter = Expression.Parameter(typeof(T), "x");
        var access = Expression.Property(parameter, property);
        var body = property.PropertyType.IsValueType
            ? Expression.Convert(access, typeof(object))
            : (Expression)access;

        return Expression.Lambda<Func<T, object>>(body, parameter);
    }
}
