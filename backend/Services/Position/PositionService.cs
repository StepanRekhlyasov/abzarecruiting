using System.Security.Claims;
using Backend.Api.Data;
using Backend.Api.Data.Relations;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Position;
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

    Task<bool> SyncRelationsAsync(
        int positionId,
        IEnumerable<int> attributeIds,
        IEnumerable<int> tagIds,
        CancellationToken cancellationToken = default);

    Task DeleteBatchAsync(IEnumerable<DeletePositionItem> items, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PositionDetailDto>> DuplicateBatchAsync(
        IEnumerable<int> ids,
        string userId,
        CancellationToken cancellationToken = default);

    Task<PositionDetailDto?> DuplicateAsync(
        int id,
        string userId,
        CancellationToken cancellationToken = default);
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
        var query = db.Positions.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(position =>
                position.Name.Contains(search)
                || position.Company.Contains(search)
                || position.Country.Contains(search)
                || position.Description.Contains(search));
        }

        if (string.Equals(pagination.NormalizedSortBy, "messagescount", StringComparison.Ordinal))
        {
            query = pagination.IsDescending
                ? query.OrderByDescending(position => position.Messages.Count)
                : query.OrderBy(position => position.Messages.Count);
        }
        else if (string.Equals(pagination.NormalizedSortBy, "resumescount", StringComparison.Ordinal))
        {
            query = pagination.IsDescending
                ? query.OrderByDescending(position => position.Resumes.Count)
                : query.OrderBy(position => position.Resumes.Count);
        }
        else
        {
            query = query.ApplySort(pagination, position => position.CreatedAt);
        }

        var allIds = await query.Select(position => position.Id).ToListAsync(cancellationToken);
        var filteredIds = await FilterPositionIdsAsync(allIds, user, cancellationToken);

        var totalCount = filteredIds.Count;
        var pageIds = filteredIds
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedSize)
            .ToList();

        var items = await LoadListItemsAsync(pageIds, keyOnly: false, cancellationToken);

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
        return ToDetailDto(items.FirstOrDefault());
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
            Level = request.Level ?? Data.Enums.PositionLevel.Junior,
            Format = request.Format ?? Data.Enums.WorkFormat.Office,
            MaxProjects = request.MaxProjects,
            CreatedAt = DateTime.UtcNow,
            CreatedById = userId,
        };

        db.Positions.Add(position);
        await db.SaveChangesAsync(cancellationToken);

        return (await LoadDetailAsync(position.Id, cancellationToken))!;
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
        position.Level = request.Level ?? Data.Enums.PositionLevel.Junior;
        position.Format = request.Format ?? Data.Enums.WorkFormat.Office;
        position.MaxProjects = request.MaxProjects;
        position.Version++;

        await db.SaveChangesAsync(cancellationToken);

        return await LoadDetailAsync(id, cancellationToken);
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

    public async Task<bool> SyncRelationsAsync(
        int positionId,
        IEnumerable<int> attributeIds,
        IEnumerable<int> tagIds,
        CancellationToken cancellationToken = default)
    {
        if (!await db.Positions.AnyAsync(position => position.Id == positionId, cancellationToken))
        {
            return false;
        }

        var desiredAttributes = attributeIds.Where(id => id > 0).Distinct().ToHashSet();
        var desiredTags = tagIds.Where(id => id > 0).Distinct().ToHashSet();

        if (desiredAttributes.Count > 0)
        {
            var existingAttributeCount = await db.Attributes
                .CountAsync(attribute => desiredAttributes.Contains(attribute.Id), cancellationToken);
            if (existingAttributeCount != desiredAttributes.Count)
            {
                throw new InvalidOperationException("error.attributes.notFound");
            }
        }

        if (desiredTags.Count > 0)
        {
            var existingTagCount = await db.Tags
                .CountAsync(tag => desiredTags.Contains(tag.Id), cancellationToken);
            if (existingTagCount != desiredTags.Count)
            {
                throw new InvalidOperationException("error.tags.notFound");
            }
        }

        var currentAttributes = await db.PositionAttributes
            .Where(item => item.PositionId == positionId)
            .ToListAsync(cancellationToken);
        var currentTags = await db.PositionTags
            .Where(item => item.PositionId == positionId)
            .ToListAsync(cancellationToken);

        var attributesToRemove = currentAttributes
            .Where(item => !desiredAttributes.Contains(item.AttributeId))
            .ToList();
        var tagsToRemove = currentTags
            .Where(item => !desiredTags.Contains(item.TagId))
            .ToList();

        if (attributesToRemove.Count > 0)
        {
            db.PositionAttributes.RemoveRange(attributesToRemove);
        }

        if (tagsToRemove.Count > 0)
        {
            db.PositionTags.RemoveRange(tagsToRemove);
        }

        var existingAttributeIds = currentAttributes.Select(item => item.AttributeId).ToHashSet();
        var existingTagIds = currentTags.Select(item => item.TagId).ToHashSet();

        foreach (var attributeId in desiredAttributes.Where(id => !existingAttributeIds.Contains(id)))
        {
            db.PositionAttributes.Add(new PositionAttribute
            {
                PositionId = positionId,
                AttributeId = attributeId,
                IsKey = true,
            });
        }

        foreach (var tagId in desiredTags.Where(id => !existingTagIds.Contains(id)))
        {
            db.PositionTags.Add(new PositionTag
            {
                PositionId = positionId,
                TagId = tagId,
                IsKey = true,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task DeleteBatchAsync(
        IEnumerable<DeletePositionItem> items,
        CancellationToken cancellationToken = default)
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
        var positions = await db.Positions
            .Where(item => ids.Contains(item.Id))
            .ToListAsync(cancellationToken);

        if (positions.Count != ids.Count)
        {
            throw new InvalidOperationException("error.positions.notFound");
        }

        var versionById = uniqueItems.ToDictionary(item => item.Id, item => item.Version);
        foreach (var position in positions)
        {
            if (position.Version != versionById[position.Id])
            {
                throw new InvalidOperationException("error.oldVersion");
            }
        }

        db.Positions.RemoveRange(positions);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PositionDetailDto>> DuplicateBatchAsync(
        IEnumerable<int> ids,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var uniqueIds = ids.Where(id => id > 0).Distinct().ToList();
        var results = new List<PositionDetailDto>();

        foreach (var id in uniqueIds)
        {
            var duplicated = await DuplicateAsync(id, userId, cancellationToken);
            if (duplicated is not null)
            {
                results.Add(duplicated);
            }
        }

        return results;
    }

    public async Task<PositionDetailDto?> DuplicateAsync(
        int id,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var source = await db.Positions
            .AsNoTracking()
            .FirstOrDefaultAsync(position => position.Id == id, cancellationToken);
        if (source is null)
        {
            return null;
        }

        var attributes = await db.PositionAttributes
            .AsNoTracking()
            .Where(item => item.PositionId == id)
            .ToListAsync(cancellationToken);

        var tags = await db.PositionTags
            .AsNoTracking()
            .Where(item => item.PositionId == id)
            .ToListAsync(cancellationToken);

        var restrictions = await db.PositionRestrictions
            .AsNoTracking()
            .Where(item => item.PositionId == id)
            .ToListAsync(cancellationToken);

        var position = new Data.Entities.Position
        {
            Name = source.Name,
            Description = source.Description,
            Company = source.Company,
            Country = source.Country,
            Level = source.Level,
            Format = source.Format,
            MaxProjects = source.MaxProjects,
            CreatedAt = DateTime.UtcNow,
            CreatedById = userId,
        };

        db.Positions.Add(position);
        await db.SaveChangesAsync(cancellationToken);

        db.PositionAttributes.AddRange(attributes.Select(item => new PositionAttribute
        {
            PositionId = position.Id,
            AttributeId = item.AttributeId,
            IsKey = item.IsKey,
        }));

        db.PositionTags.AddRange(tags.Select(item => new PositionTag
        {
            PositionId = position.Id,
            TagId = item.TagId,
            IsKey = item.IsKey,
        }));

        db.PositionRestrictions.AddRange(restrictions.Select(item => new PositionRestriction
        {
            PositionId = position.Id,
            AttributeId = item.AttributeId,
            TagId = item.TagId,
            Condition = item.Condition,
            TargetValue = item.TargetValue,
            CreatedAt = DateTime.UtcNow,
            CreatedById = userId,
        }));

        await db.SaveChangesAsync(cancellationToken);

        return await LoadDetailAsync(position.Id, cancellationToken);
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

    private async Task<PositionDetailDto?> LoadDetailAsync(int id, CancellationToken cancellationToken)
    {
        var items = await LoadListItemsAsync([id], keyOnly: false, cancellationToken);
        return ToDetailDto(items.FirstOrDefault());
    }

    private static PositionDetailDto? ToDetailDto(PositionListItemDto? item) =>
        item is null
            ? null
            : new PositionDetailDto
            {
                Id = item.Id,
                Name = item.Name,
                Description = item.Description,
                Company = item.Company,
                Country = item.Country,
                Level = item.Level,
                Format = item.Format,
                MaxProjects = item.MaxProjects,
                CreatedAt = item.CreatedAt,
                Version = item.Version,
                CreatedByName = item.CreatedByName,
                MessagesCount = item.MessagesCount,
                ResumesCount = item.ResumesCount,
                HasRestrictions = item.HasRestrictions,
                Attributes = item.Attributes,
                Tags = item.Tags,
            };

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

        var creatorIds = positions
            .Select(position => position.CreatedById)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id!)
            .Distinct()
            .ToList();
        var creatorNames = await LoadCreatorNameMapAsync(creatorIds, cancellationToken);

        var messageCounts = await db.PositionMessages
            .AsNoTracking()
            .Where(message => ids.Contains(message.PositionId))
            .GroupBy(message => message.PositionId)
            .Select(group => new { PositionId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.PositionId, item => item.Count, cancellationToken);

        var resumeCounts = await db.Resumes
            .AsNoTracking()
            .Where(resume => ids.Contains(resume.PositionId))
            .GroupBy(resume => resume.PositionId)
            .Select(group => new { PositionId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.PositionId, item => item.Count, cancellationToken);

        var positionsWithRestrictions = await db.PositionRestrictions
            .AsNoTracking()
            .Where(restriction => ids.Contains(restriction.PositionId))
            .Select(restriction => restriction.PositionId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var restrictionPositionIds = positionsWithRestrictions.ToHashSet();

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
                MaxProjects = position.MaxProjects,
                CreatedAt = position.CreatedAt,
                Version = position.Version,
                CreatedByName = position.CreatedById is null
                    ? string.Empty
                    : creatorNames.GetValueOrDefault(position.CreatedById) ?? string.Empty,
                MessagesCount = messageCounts.GetValueOrDefault(position.Id),
                ResumesCount = resumeCounts.GetValueOrDefault(position.Id),
                HasRestrictions = restrictionPositionIds.Contains(position.Id),
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

    private async Task<Dictionary<string, string>> LoadCreatorNameMapAsync(
        IReadOnlyList<string> userIds,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return [];
        }

        var userIdSet = userIds.ToHashSet(StringComparer.Ordinal);

        var nameAttributeIds = await db.Attributes
            .AsNoTracking()
            .Where(attribute =>
                attribute.Name == DefaultAttributes.FirstName || attribute.Name == DefaultAttributes.LastName)
            .Select(attribute => new { attribute.Id, attribute.Name })
            .ToListAsync(cancellationToken);

        var firstNameId = nameAttributeIds.FirstOrDefault(item => item.Name == DefaultAttributes.FirstName)?.Id;
        var lastNameId = nameAttributeIds.FirstOrDefault(item => item.Name == DefaultAttributes.LastName)?.Id;

        var profileAttributes = await db.ProfileAttributes
            .AsNoTracking()
            .Where(profileAttribute =>
                (firstNameId.HasValue && profileAttribute.AttributeId == firstNameId.Value)
                || (lastNameId.HasValue && profileAttribute.AttributeId == lastNameId.Value))
            .Select(profileAttribute => new
            {
                profileAttribute.CandidateId,
                profileAttribute.AttributeId,
                profileAttribute.ValueString,
            })
            .ToListAsync(cancellationToken);

        var relevantAttributes = profileAttributes
            .Where(item => userIdSet.Contains(item.CandidateId))
            .ToList();

        return userIds.ToDictionary(
            userId => userId,
            userId =>
            {
                var firstName = firstNameId.HasValue
                    ? relevantAttributes
                        .FirstOrDefault(item => item.CandidateId == userId && item.AttributeId == firstNameId.Value)
                        ?.ValueString
                        ?.Trim()
                        ?? string.Empty
                    : string.Empty;
                var lastName = lastNameId.HasValue
                    ? relevantAttributes
                        .FirstOrDefault(item => item.CandidateId == userId && item.AttributeId == lastNameId.Value)
                        ?.ValueString
                        ?.Trim()
                        ?? string.Empty
                    : string.Empty;

                return string.Join(' ', new[] { firstName, lastName }.Where(part => !string.IsNullOrWhiteSpace(part)));
            });
    }
}
