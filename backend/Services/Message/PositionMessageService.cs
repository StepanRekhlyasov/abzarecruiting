using Backend.Api.Data;
using Backend.Api.Data.Entities;
using Backend.Api.Extensions;
using Backend.Api.Models.Message;
using Backend.Api.Services.User;
using Backend.Api.WebSockets;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Message;

public interface IPositionMessageService
{
    Task<IReadOnlyList<PositionMessageDto>> GetByPositionAsync(
        int positionId,
        CancellationToken cancellationToken = default);

    Task<PositionMessageDto?> CreateAsync(
        int positionId,
        CreatePositionMessageRequest request,
        string userId,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int positionId, int messageId, CancellationToken cancellationToken = default);
}

public class PositionMessageService(
    ApplicationDbContext db,
    NotificationWebSocketHandler webSocketHandler,
    IUserNameService userNameService) : IPositionMessageService
{
    public const string CreatedEventType = "positionMessageCreated";
    public const string DeletedEventType = "positionMessageDeleted";

    public async Task<IReadOnlyList<PositionMessageDto>> GetByPositionAsync(
        int positionId,
        CancellationToken cancellationToken = default)
    {
        var positionExists = await db.Positions
            .AsNoTracking()
            .AnyAsync(position => position.Id == positionId, cancellationToken);
        if (!positionExists)
        {
            return [];
        }

        var messages = await db.PositionMessages
            .AsNoTracking()
            .Where(message => message.PositionId == positionId)
            .OrderByDescending(message => message.CreatedAt)
            .ThenByDescending(message => message.Id)
            .ToListAsync(cancellationToken);

        return await MapMessagesAsync(messages, cancellationToken);
    }

    public async Task<PositionMessageDto?> CreateAsync(
        int positionId,
        CreatePositionMessageRequest request,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var content = request.Content.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("error.messages.contentRequired");
        }

        var positionExists = await db.Positions
            .AsNoTracking()
            .AnyAsync(position => position.Id == positionId, cancellationToken);
        if (!positionExists)
        {
            return null;
        }

        var message = new PositionMessage
        {
            PositionId = positionId,
            Content = content,
            CreatedById = userId,
            CreatedAt = DateTime.UtcNow,
        };

        db.PositionMessages.Add(message);
        await db.SaveChangesAsync(cancellationToken);

        var dto = (await MapMessagesAsync([message], cancellationToken)).First();
        var messagesCount = await db.PositionMessages
            .AsNoTracking()
            .CountAsync(item => item.PositionId == positionId, cancellationToken);

        await webSocketHandler.BroadcastAsync(
            new PositionMessageChangedEvent
            {
                Type = CreatedEventType,
                PositionId = positionId,
                MessagesCount = messagesCount,
                Message = dto,
            },
            cancellationToken);

        return dto;
    }

    public async Task<bool> DeleteAsync(
        int positionId,
        int messageId,
        CancellationToken cancellationToken = default)
    {
        var message = await db.PositionMessages
            .FirstOrDefaultAsync(
                item => item.Id == messageId && item.PositionId == positionId,
                cancellationToken);
        if (message is null)
        {
            return false;
        }

        db.PositionMessages.Remove(message);
        await db.SaveChangesAsync(cancellationToken);

        var messagesCount = await db.PositionMessages
            .AsNoTracking()
            .CountAsync(item => item.PositionId == positionId, cancellationToken);

        await webSocketHandler.BroadcastAsync(
            new PositionMessageChangedEvent
            {
                Type = DeletedEventType,
                PositionId = positionId,
                MessagesCount = messagesCount,
                MessageId = messageId,
            },
            cancellationToken);

        return true;
    }

    private async Task<IReadOnlyList<PositionMessageDto>> MapMessagesAsync(
        IReadOnlyList<PositionMessage> messages,
        CancellationToken cancellationToken)
    {
        if (messages.Count == 0)
        {
            return [];
        }

        var userIds = messages
            .Select(message => message.CreatedById)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id!)
            .Distinct()
            .ToList();

        var nameMap = await userNameService.GetFullNameMapAsync(userIds, cancellationToken);
        var roleMap = await LoadRoleMapAsync(userIds, cancellationToken);

        return messages
            .Select(message => new PositionMessageDto
            {
                Id = message.Id,
                PositionId = message.PositionId,
                Content = message.Content,
                CreatedById = message.CreatedById,
                CreatedByName = message.CreatedById is null
                    ? string.Empty
                    : nameMap.GetValueOrDefault(message.CreatedById) ?? string.Empty,
                CreatedByRole = message.CreatedById is null
                    ? string.Empty
                    : roleMap.GetValueOrDefault(message.CreatedById) ?? string.Empty,
                CreatedAt = message.CreatedAt,
            })
            .ToList();
    }

    private async Task<Dictionary<string, string>> LoadRoleMapAsync(
        IReadOnlyList<string> userIds,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return [];
        }

        var userIdSet = userIds.ToHashSet(StringComparer.Ordinal);

        // Avoid Contains(string[]) — MySql.EntityFrameworkCore 10 fails type mapping for string collections.
        var roleRows = await (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            select new { userRole.UserId, role.Name }
        ).ToListAsync(cancellationToken);

        return roleRows
            .Where(row => userIdSet.Contains(row.UserId))
            .GroupBy(row => row.UserId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(row => row.Name).FirstOrDefault(name => !string.IsNullOrWhiteSpace(name))
                    ?? string.Empty);
    }
}
