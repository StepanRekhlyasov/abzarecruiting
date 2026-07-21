using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.User;
using Backend.Api.Services.Auth;
using Backend.Api.Services.Profile;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.User;

public interface IUserService
{
    Task<PagedResult<UserListItemDto>> GetListAsync(
        PaginationParams pagination,
        bool candidatesOnly,
        bool includeLockedOut,
        string? role,
        bool? isLockedOut,
        bool? emailConfirmed,
        CancellationToken cancellationToken);

    Task<UserListItemDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken);

    Task ChangeRoleBatchAsync(
        ChangeUsersRoleBatchRequest request,
        CancellationToken cancellationToken);

    Task DeleteBatchAsync(IReadOnlyList<string> userIds, CancellationToken cancellationToken);

    Task SetLockoutAsync(string userId, bool locked, CancellationToken cancellationToken);

    Task SetActivationAsync(string userId, bool activated, CancellationToken cancellationToken);

    Task SendActivationEmailAsync(
        string userId,
        string frontendBaseUrl,
        CancellationToken cancellationToken);
}

public class UserService(
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext db,
    IProfileAttributeService profileAttributeService,
    IAccountEmailService accountEmailService,
    IUserNameService userNameService) : IUserService
{
    private static DateTimeOffset CreatePermanentLockoutEnd() => DateTimeOffset.UtcNow.AddYears(100);

    public async Task<PagedResult<UserListItemDto>> GetListAsync(
        PaginationParams pagination,
        bool candidatesOnly,
        bool includeLockedOut,
        string? role,
        bool? isLockedOut,
        bool? emailConfirmed,
        CancellationToken cancellationToken)
    {
        var users = await userManager.Users
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var userIds = users.Select(user => user.Id).ToList();
        var nameMap = await userNameService.GetNamePartsMapAsync(userIds, cancellationToken);
        var roleMap = await LoadRoleMapAsync(userIds, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        IEnumerable<UserListItemDto> items = users
            .Select(user =>
            {
                nameMap.TryGetValue(user.Id, out var names);
                roleMap.TryGetValue(user.Id, out var userRole);

                return new UserListItemDto
                {
                    Id = user.Id,
                    Email = user.Email ?? string.Empty,
                    FirstName = names.FirstName,
                    LastName = names.LastName,
                    Role = userRole ?? string.Empty,
                    EmailConfirmed = user.EmailConfirmed,
                    IsLockedOut = user.LockoutEnd.HasValue && user.LockoutEnd > now,
                    CreatedAt = user.CreatedAt,
                };
            });

        if (!includeLockedOut)
        {
            items = items.Where(user => !user.IsLockedOut);
        }

        if (candidatesOnly)
        {
            items = items.Where(user => user.Role == Roles.Candidate);
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var normalizedRole = role.Trim();
            items = items.Where(user =>
                string.Equals(user.Role, normalizedRole, StringComparison.OrdinalIgnoreCase));
        }

        if (isLockedOut.HasValue)
        {
            items = items.Where(user => user.IsLockedOut == isLockedOut.Value);
        }

        if (emailConfirmed.HasValue)
        {
            items = items.Where(user => user.EmailConfirmed == emailConfirmed.Value);
        }

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            items = items.Where(user =>
                user.Email.Contains(search, StringComparison.OrdinalIgnoreCase)
                || user.FirstName.Contains(search, StringComparison.OrdinalIgnoreCase)
                || user.LastName.Contains(search, StringComparison.OrdinalIgnoreCase)
                || user.Role.Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        items = items.AsQueryable().ApplySort(pagination, user => user.CreatedAt);

        var filtered = items.ToList();
        var totalCount = filtered.Count;
        var pageItems = filtered
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedSize)
            .ToList();

        return new PagedResult<UserListItemDto>
        {
            Items = pageItems,
            TotalCount = totalCount,
            Page = pagination.NormalizedPage,
            Size = pagination.NormalizedSize,
        };
    }

    public async Task<UserListItemDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken)
    {
        if (!Roles.All.Contains(request.Role))
        {
            throw new InvalidOperationException("error.auth.invalidRole");
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow,
            EmailConfirmed = true,
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join(" ", result.Errors.Select(error => error.Description)));
        }

        await userManager.AddToRoleAsync(user, request.Role);

        try
        {
            await profileAttributeService.SetStringValuesAsync(user.Id, new Dictionary<string, string>
            {
                [DefaultAttributes.FirstName] = request.FirstName,
                [DefaultAttributes.LastName] = request.LastName,
                [DefaultAttributes.Email] = request.Email,
            });
        }
        catch (InvalidOperationException)
        {
            await userManager.DeleteAsync(user);
            throw;
        }

        return new UserListItemDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = request.Role,
            EmailConfirmed = user.EmailConfirmed,
            IsLockedOut = false,
            CreatedAt = user.CreatedAt,
        };
    }

    public async Task ChangeRoleBatchAsync(
        ChangeUsersRoleBatchRequest request,
        CancellationToken cancellationToken)
    {
        if (!Roles.All.Contains(request.Role))
        {
            throw new InvalidOperationException("error.auth.invalidRole");
        }

        var distinctIds = request.UserIds.Distinct().ToList();
        if (distinctIds.Count == 0)
        {
            return;
        }

        var idSet = distinctIds.ToHashSet(StringComparer.Ordinal);
        var users = await userManager.Users.ToListAsync(cancellationToken);
        var matched = users.Where(user => idSet.Contains(user.Id)).ToList();

        if (matched.Count != distinctIds.Count)
        {
            throw new InvalidOperationException("error.users.notFound");
        }

        var role = await db.Roles.FirstOrDefaultAsync(item => item.Name == request.Role, cancellationToken)
            ?? throw new InvalidOperationException("error.auth.invalidRole");

        // Avoid Contains(string[]) — MySql.EntityFrameworkCore 10 fails type mapping for string collections.
        var userRoles = await db.UserRoles.ToListAsync(cancellationToken);
        var rolesToRemove = userRoles.Where(userRole => idSet.Contains(userRole.UserId)).ToList();
        if (rolesToRemove.Count > 0)
        {
            db.UserRoles.RemoveRange(rolesToRemove);
        }

        db.UserRoles.AddRange(matched.Select(user => new IdentityUserRole<string>
        {
            UserId = user.Id,
            RoleId = role.Id,
        }));

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteBatchAsync(
        IReadOnlyList<string> userIds,
        CancellationToken cancellationToken)
    {
        var distinctIds = userIds.Distinct().ToList();
        if (distinctIds.Count == 0)
        {
            return;
        }

        var idSet = distinctIds.ToHashSet(StringComparer.Ordinal);
        var users = await userManager.Users.ToListAsync(cancellationToken);
        var matched = users.Where(user => idSet.Contains(user.Id)).ToList();

        if (matched.Count != distinctIds.Count)
        {
            throw new InvalidOperationException("error.users.notFound");
        }

        await DeleteUsersOwnedContentAsync(distinctIds, cancellationToken);

        foreach (var user in matched)
        {
            try
            {
                var result = await userManager.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    throw new InvalidOperationException(
                        string.Join(" ", result.Errors.Select(error => error.Description)));
                }
            }
            catch (DbUpdateException)
            {
                throw new InvalidOperationException("error.users.deleteFailed");
            }
        }
    }

    private async Task DeleteUsersOwnedContentAsync(
        IReadOnlyList<string> userIds,
        CancellationToken cancellationToken)
    {
        foreach (var userId in userIds)
        {
            await DeleteUserOwnedContentAsync(userId, cancellationToken);
        }
    }

    private async Task DeleteUserOwnedContentAsync(string userId, CancellationToken cancellationToken)
    {
        // Explicit cleanup of user-owned content. Remaining CreatedBy FKs use SetNull.
        await db.Positions
            .Where(position => position.CreatedById == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await db.PositionRestrictions
            .Where(restriction => restriction.CreatedById == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await db.PositionMessages
            .Where(message => message.CreatedById == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await db.Tags
            .Where(tag => tag.CreatedById == userId)
            .ExecuteDeleteAsync(cancellationToken);

        // Default attributes have CreatedById = null and are never deleted here.
        await db.Attributes
            .Where(attribute => attribute.CreatedById == userId)
            .ExecuteDeleteAsync(cancellationToken);
    }

    public async Task SetLockoutAsync(string userId, bool locked, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("error.users.notFound");

        if (locked)
        {
            await userManager.SetLockoutEnabledAsync(user, true);
            var result = await userManager.SetLockoutEndDateAsync(user, CreatePermanentLockoutEnd());
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(string.Join(" ", result.Errors.Select(error => error.Description)));
            }

            return;
        }

        var unlockResult = await userManager.SetLockoutEndDateAsync(user, null);
        if (!unlockResult.Succeeded)
        {
            throw new InvalidOperationException(string.Join(" ", unlockResult.Errors.Select(error => error.Description)));
        }

        await userManager.ResetAccessFailedCountAsync(user);
    }

    public async Task SetActivationAsync(string userId, bool activated, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("error.users.notFound");

        if (activated)
        {
            if (user.EmailConfirmed)
            {
                return;
            }

            user.EmailConfirmed = true;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(string.Join(" ", result.Errors.Select(error => error.Description)));
            }

            return;
        }

        if (!user.EmailConfirmed)
        {
            return;
        }

        user.EmailConfirmed = false;
        var deactivateResult = await userManager.UpdateAsync(user);
        if (!deactivateResult.Succeeded)
        {
            throw new InvalidOperationException(string.Join(" ", deactivateResult.Errors.Select(error => error.Description)));
        }
    }

    public async Task SendActivationEmailAsync(
        string userId,
        string frontendBaseUrl,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("error.users.notFound");

        if (user.EmailConfirmed)
        {
            throw new InvalidOperationException("error.users.alreadyActivated");
        }

        await accountEmailService.SendActivationEmailAsync(user, frontendBaseUrl, cancellationToken);
    }

    private async Task<Dictionary<string, string>> LoadRoleMapAsync(
        List<string> userIds,
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
