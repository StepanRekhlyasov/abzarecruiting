using System.Security.Claims;
using Backend.Api.Data;
using Backend.Api.Data.Entities;
using Backend.Api.Data.Relations;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Position;
using Backend.Api.Services.Position;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Position;

public interface IPositionService
{
    Task<PagedResult<PositionListItemDto>> GetListAsync(
        PaginationParams pagination,
        ClaimsPrincipal? user,
        CancellationToken cancellationToken = default);

    Task<PositionDetailDto?> GetByIdAsync(
        int id,
        ClaimsPrincipal? user,
        CancellationToken cancellationToken = default);

    Task<PositionDetailDto> CreateAsync(
        CreatePositionRequest request,
        string userId,
        CancellationToken cancellationToken = default);

    Task<PositionDetailDto?> UpdateAsync(
        int id,
        UpdatePositionRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default);

    Task<bool> UpsertAttributeAsync(
        int positionId,
        int attributeId,
        PositionRelationRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAttributeAsync(int positionId, int attributeId, CancellationToken cancellationToken = default);

    Task<bool> UpsertTagAsync(
        int positionId,
        int tagId,
        PositionRelationRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteTagAsync(int positionId, int tagId, CancellationToken cancellationToken = default);
}

public class PositionService(
    ApplicationDbContext db,
    IPositionRestrictionEvaluator restrictionEvaluator) : IPositionService
{
    private const string VersionChangedMessage = "error.oldVersion";
    public async Task<PagedResult<PositionListItemDto>> GetListAsync(
        PaginationParams pagination,
        ClaimsPrincipal? user,
        CancellationToken cancellationToken = default)
    {
        var query = db.Positions.AsNoTracking().OrderByDescending(position => position.CreatedAt);
        var allIds = await query.Select(position => position.Id).ToListAsync(cancellationToken);
        var filteredIds = await FilterPositionIdsAsync(allIds, user, cancellationToken);

        var totalCount = filteredIds.Count;
        var pageIds = filteredIds
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedSize)
            .ToList();

        var items = await LoadListItemsAsync(pageIds, keyOnly: true, cancellationToken);

        return new PagedResult<PositionListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = pagination.NormalizedPage,
            Size = pagination.NormalizedSize,
        };
    }

    public async Task<PositionDetailDto?> GetByIdAsync(
        int id,
        ClaimsPrincipal? user,
        CancellationToken cancellationToken = default)
    {
        if (!await IsPositionVisibleAsync(id, user, cancellationToken))
        {
            return null;
        }

        var items = await LoadListItemsAsync([id], keyOnly: false, cancellationToken);
        return items.FirstOrDefault() is { } item
            ? new PositionDetailDto
            {
                Id = item.Id,
                Name = item.Name,
                Description = item.Description,
                Company = item.Company,
                Country = item.Country,
                Level = item.Level,
                Format = item.Format,
                CreatedAt = item.CreatedAt,
                Version = item.Version,
                Attributes = item.Attributes,
                Tags = item.Tags,
            }
            : null;
    }

    public async Task<PositionDetailDto> CreateAsync(
        CreatePositionRequest request,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var position = new Data.Entities.Position
        {
            Name = request.Name,
            Description = request.Description,
            Company = request.Company,
            Country = request.Country,
            Level = request.Level,
            Format = request.Format,
            CreatedAt = DateTime.UtcNow,
            CreatedById = userId,
        };

        db.Positions.Add(position);
        await db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(position.Id, null, cancellationToken))!;
    }

    public async Task<PositionDetailDto?> UpdateAsync(
        int id,
        UpdatePositionRequest request,
        CancellationToken cancellationToken = default)
    {
        var position = await db.Positions.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (position is null)
        {
            return null;
        }

        if (position.Version != request.Version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }

        position.Name = request.Name;
        position.Description = request.Description;
        position.Company = request.Company;
        position.Country = request.Country;
        position.Level = request.Level;
        position.Format = request.Format;
        position.Version++;

        await db.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, null, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, int version, CancellationToken cancellationToken = default)
    {
        var position = await db.Positions.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (position is null)
        {
            return false;
        }

        if (position.Version != version)
        {
            throw new InvalidOperationException(VersionChangedMessage);
        }

        db.Positions.Remove(position);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UpsertAttributeAsync(
        int positionId,
        int attributeId,
        PositionRelationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await db.Positions.AnyAsync(position => position.Id == positionId, cancellationToken)
            || !await db.Attributes.AnyAsync(attribute => attribute.Id == attributeId, cancellationToken))
        {
            return false;
        }

        var relation = await db.PositionAttributes
            .FirstOrDefaultAsync(item => item.PositionId == positionId && item.AttributeId == attributeId, cancellationToken);

        if (relation is null)
        {
            db.PositionAttributes.Add(new PositionAttribute
            {
                PositionId = positionId,
                AttributeId = attributeId,
                IsKey = request.IsKey,
            });
        }
        else
        {
            relation.IsKey = request.IsKey;
        }

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAttributeAsync(
        int positionId,
        int attributeId,
        CancellationToken cancellationToken = default)
    {
        var relation = await db.PositionAttributes
            .FirstOrDefaultAsync(item => item.PositionId == positionId && item.AttributeId == attributeId, cancellationToken);

        if (relation is null)
        {
            return false;
        }

        db.PositionAttributes.Remove(relation);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UpsertTagAsync(
        int positionId,
        int tagId,
        PositionRelationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await db.Positions.AnyAsync(position => position.Id == positionId, cancellationToken)
            || !await db.Tags.AnyAsync(tag => tag.Id == tagId, cancellationToken))
        {
            return false;
        }

        var relation = await db.PositionTags
            .FirstOrDefaultAsync(item => item.PositionId == positionId && item.TagId == tagId, cancellationToken);

        if (relation is null)
        {
            db.PositionTags.Add(new PositionTag
            {
                PositionId = positionId,
                TagId = tagId,
                IsKey = request.IsKey,
            });
        }
        else
        {
            relation.IsKey = request.IsKey;
        }

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteTagAsync(int positionId, int tagId, CancellationToken cancellationToken = default)
    {
        var relation = await db.PositionTags
            .FirstOrDefaultAsync(item => item.PositionId == positionId && item.TagId == tagId, cancellationToken);

        if (relation is null)
        {
            return false;
        }

        db.PositionTags.Remove(relation);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<List<int>> FilterPositionIdsAsync(
        IReadOnlyList<int> positionIds,
        ClaimsPrincipal? user,
        CancellationToken cancellationToken)
    {
        if (positionIds.Count == 0)
        {
            return [];
        }

        if (user?.IsRecruiterOrAdmin() == true)
        {
            return positionIds.ToList();
        }

        if (user?.IsCandidate() == true)
        {
            var visible = await restrictionEvaluator
                .GetVisiblePositionIdsForCandidateAsync(user.GetUserId()!, positionIds, cancellationToken);

            return positionIds.Where(id => visible.Contains(id)).ToList();
        }

        var withRestrictions = await restrictionEvaluator.GetPositionIdsWithRestrictionsAsync(positionIds, cancellationToken);

        return positionIds.Where(id => !withRestrictions.Contains(id)).ToList();
    }

    private async Task<bool> IsPositionVisibleAsync(
        int positionId,
        ClaimsPrincipal? user,
        CancellationToken cancellationToken)
    {
        if (!await db.Positions.AnyAsync(position => position.Id == positionId, cancellationToken))
        {
            return false;
        }

        if (user?.IsRecruiterOrAdmin() == true)
        {
            return true;
        }

        if (user?.IsCandidate() == true)
        {
            var visible = await restrictionEvaluator.GetVisiblePositionIdsForCandidateAsync(
                user.GetUserId()!,
                [positionId],
                cancellationToken);

            return visible.Contains(positionId);
        }

        var withRestrictions = await restrictionEvaluator.GetPositionIdsWithRestrictionsAsync([positionId], cancellationToken);
        return !withRestrictions.Contains(positionId);
    }

    private async Task<IReadOnlyList<PositionListItemDto>> LoadListItemsAsync(
        IReadOnlyList<int> ids,
        bool keyOnly,
        CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        var positions = await db.Positions
            .AsNoTracking()
            .Where(position => ids.Contains(position.Id))
            .ToListAsync(cancellationToken);

        var attributes = await db.PositionAttributes
            .AsNoTracking()
            .Include(item => item.Attribute)
            .Where(item => ids.Contains(item.PositionId) && (!keyOnly || item.IsKey))
            .ToListAsync(cancellationToken);

        var tags = await db.PositionTags
            .AsNoTracking()
            .Include(item => item.Tag)
            .Where(item => ids.Contains(item.PositionId) && (!keyOnly || item.IsKey))
            .ToListAsync(cancellationToken);

        var orderMap = ids.Select((id, index) => (id, index)).ToDictionary(pair => pair.id, pair => pair.index);

        return positions
            .OrderBy(position => orderMap[position.Id])
            .Select(position => new PositionListItemDto
            {
                Id = position.Id,
                Name = position.Name,
                Description = position.Description,
                Company = position.Company,
                Country = position.Country,
                Level = position.Level,
                Format = position.Format,
                CreatedAt = position.CreatedAt,
                Version = position.Version,
                Attributes = attributes
                    .Where(item => item.PositionId == position.Id)
                    .Select(item => new PositionAttributeDto
                    {
                        AttributeId = item.AttributeId,
                        Name = item.Attribute.Name,
                        IsKey = item.IsKey,
                    })
                    .ToList(),
                Tags = tags
                    .Where(item => item.PositionId == position.Id)
                    .Select(item => new PositionTagDto
                    {
                        TagId = item.TagId,
                        Name = item.Tag.Name,
                        IsKey = item.IsKey,
                    })
                    .ToList(),
            })
            .ToList();
    }
}
