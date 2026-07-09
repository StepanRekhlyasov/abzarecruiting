using Backend.Api.Data;
using Backend.Api.Models.Common;
using Backend.Api.Models.Tag;
using Microsoft.EntityFrameworkCore;
using TagEntity = Backend.Api.Data.Entities.Tag;

namespace Backend.Api.Services.Tag;

public interface ITagService
{
    Task<PagedResult<TagDto>> GetListAsync(PaginationParams pagination, CancellationToken cancellationToken = default);

    Task<TagDto> CreateAsync(CreateTagRequest request, string userId, CancellationToken cancellationToken = default);

    Task<TagDto?> UpdateAsync(int id, UpdateTagRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default);
}

public class TagService(ApplicationDbContext db) : ITagService
{
    private const string VersionChangedMessage = "error.oldVersion";

    public async Task<PagedResult<TagDto>> GetListAsync(
        PaginationParams pagination,
        CancellationToken cancellationToken = default)
    {
        var query = db.Tags.AsNoTracking().OrderBy(tag => tag.Name);
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
}
