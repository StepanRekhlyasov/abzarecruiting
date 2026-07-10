using System.Linq.Expressions;
using Backend.Api.Models.Common;
using Backend.Api.Models.User;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using PositionEntity = Backend.Api.Data.Entities.Position;
using TagEntity = Backend.Api.Data.Entities.Tag;

namespace Backend.Api.Extensions;

public static class SortExtensions
{
    private static readonly Dictionary<string, Func<UserListItemDto, object?>> UserSortColumns =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["id"] = user => user.Id,
            ["email"] = user => user.Email,
            ["firstname"] = user => user.FirstName,
            ["lastname"] = user => user.LastName,
            ["role"] = user => user.Role,
            ["createdat"] = user => user.CreatedAt,
        };

    private static readonly Dictionary<string, Expression<Func<TagEntity, object>>> TagSortColumns =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["id"] = tag => tag.Id,
            ["name"] = tag => tag.Name,
            ["createdat"] = tag => tag.CreatedAt,
        };

    private static readonly Dictionary<string, Expression<Func<PositionEntity, object>>> PositionSortColumns =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["id"] = position => position.Id,
            ["name"] = position => position.Name,
            ["company"] = position => position.Company,
            ["country"] = position => position.Country,
            ["level"] = position => position.Level,
            ["format"] = position => position.Format,
            ["createdat"] = position => position.CreatedAt,
        };

    private static readonly Dictionary<string, Expression<Func<AttributeEntity, object>>> AttributeSortColumns =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["id"] = attribute => attribute.Id,
            ["name"] = attribute => attribute.Name,
            ["description"] = attribute => attribute.Description!,
            ["valuetype"] = attribute => attribute.ValueType,
            ["inputtype"] = attribute => attribute.InputType,
            ["createdat"] = attribute => attribute.CreatedAt,
        };

    public static IEnumerable<UserListItemDto> ApplySort(
        this IEnumerable<UserListItemDto> source,
        PaginationParams pagination) =>
        ApplySort(source, pagination, UserSortColumns, user => user.CreatedAt);

    public static IQueryable<TagEntity> ApplySort(
        this IQueryable<TagEntity> source,
        PaginationParams pagination) =>
        ApplySort(source, pagination, TagSortColumns, tag => tag.Name);

    public static IQueryable<PositionEntity> ApplySort(
        this IQueryable<PositionEntity> source,
        PaginationParams pagination) =>
        ApplySort(source, pagination, PositionSortColumns, position => position.CreatedAt);

    public static IQueryable<AttributeEntity> ApplySort(
        this IQueryable<AttributeEntity> source,
        PaginationParams pagination) =>
        ApplySort(source, pagination, AttributeSortColumns, attribute => attribute.Name);

    private static IEnumerable<T> ApplySort<T>(
        IEnumerable<T> source,
        PaginationParams pagination,
        IReadOnlyDictionary<string, Func<T, object?>> columns,
        Func<T, object?> defaultKey)
    {
        var selector = Resolve(pagination.NormalizedSortBy, columns, defaultKey);

        return pagination.IsDescending
            ? source.OrderByDescending(selector)
            : source.OrderBy(selector);
    }

    private static IQueryable<T> ApplySort<T>(
        IQueryable<T> source,
        PaginationParams pagination,
        IReadOnlyDictionary<string, Expression<Func<T, object>>> columns,
        Expression<Func<T, object>> defaultKey)
    {
        var selector = Resolve(pagination.NormalizedSortBy, columns, defaultKey);

        return pagination.IsDescending
            ? source.OrderByDescending(selector)
            : source.OrderBy(selector);
    }

    private static TSelector Resolve<TSelector>(
        string? sortBy,
        IReadOnlyDictionary<string, TSelector> columns,
        TSelector defaultKey)
        where TSelector : class
    {
        if (string.IsNullOrEmpty(sortBy))
        {
            return defaultKey;
        }

        return columns.TryGetValue(sortBy, out var selector)
            ? selector
            : defaultKey;
    }
}
