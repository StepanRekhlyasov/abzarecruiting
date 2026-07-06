namespace Backend.Api.Models.Common;

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];

    public int TotalCount { get; init; }

    public int Page { get; init; }

    public int Size { get; init; }
}
