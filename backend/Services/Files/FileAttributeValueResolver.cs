using System.Linq.Expressions;
using Backend.Api.Data;
using Backend.Api.Models.Files;
using Microsoft.EntityFrameworkCore;
using FileEntity = Backend.Api.Data.Entities.File;

namespace Backend.Api.Services.Files;

public static class FileAttributeValueResolver
{
    public static bool IsFileValueType(string valueType) =>
        valueType.Equals("image", StringComparison.OrdinalIgnoreCase)
        || valueType.Equals("file", StringComparison.OrdinalIgnoreCase);

    public static async Task<IReadOnlyDictionary<Guid, FileEntity>> LoadFilesAsync(
        ApplicationDbContext db,
        IEnumerable<string?> storedValues,
        CancellationToken cancellationToken = default)
    {
        var uids = storedValues
            .Where(value => !string.IsNullOrWhiteSpace(value) && Guid.TryParse(value, out _))
            .Select(value => Guid.Parse(value!))
            .Distinct()
            .ToList();

        if (uids.Count == 0)
        {
            return new Dictionary<Guid, FileEntity>();
        }

        // Avoid Contains(Guid[]) — MySql.EntityFrameworkCore 10 fails type mapping for collection parameters.
        var files = await db.Files
            .AsNoTracking()
            .Where(BuildUidEqualsAny(uids))
            .ToListAsync(cancellationToken);

        return files.ToDictionary(file => file.Uid);
    }

    public static object? ToDisplayValue(
        string valueType,
        string? storedValue,
        IReadOnlyDictionary<Guid, FileEntity> files)
    {
        if (!IsFileValueType(valueType))
        {
            return storedValue;
        }

        if (!Guid.TryParse(storedValue, out var uid) || !files.TryGetValue(uid, out var file))
        {
            return null;
        }

        return new FileAttributeValueDto
        {
            Uid = file.Uid,
            Url = file.Url,
            Name = file.Name,
        };
    }

    private static Expression<Func<FileEntity, bool>> BuildUidEqualsAny(IReadOnlyList<Guid> uids)
    {
        var parameter = Expression.Parameter(typeof(FileEntity), "file");
        var property = Expression.Property(parameter, nameof(FileEntity.Uid));

        Expression? body = null;
        foreach (var uid in uids)
        {
            var equals = Expression.Equal(property, Expression.Constant(uid, typeof(Guid)));
            body = body is null ? equals : Expression.OrElse(body, equals);
        }

        return Expression.Lambda<Func<FileEntity, bool>>(body!, parameter);
    }
}
