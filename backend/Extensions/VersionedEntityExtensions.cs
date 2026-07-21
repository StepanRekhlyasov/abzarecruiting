namespace Backend.Api.Extensions;

public static class VersionedEntityExtensions
{
    public const string VersionChangedMessage = "error.oldVersion";

    public static void EnsureVersion(int currentVersion, int expectedVersion)
    {
        if (currentVersion != expectedVersion)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }
    }

    public static List<TItem> DeduplicateById<TItem>(
        IEnumerable<TItem> items,
        Func<TItem, int> idSelector)
    {
        return items
            .GroupBy(idSelector)
            .Select(group => group.Last())
            .ToList();
    }

    public static void EnsureAllVersionsMatch<TEntity>(
        IEnumerable<TEntity> entities,
        IReadOnlyDictionary<int, int> versionById,
        Func<TEntity, int> idSelector,
        Func<TEntity, int> versionSelector)
    {
        foreach (var entity in entities)
        {
            EnsureVersion(versionSelector(entity), versionById[idSelector(entity)]);
        }
    }
}
