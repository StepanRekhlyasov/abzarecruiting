using Backend.Api.Data;
using Backend.Api.Models.Common;
using Backend.Api.Models.User;
using Backend.Api.Services.Profile;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.User;

public interface IUserService
{
    Task<PagedResult<UserListItemDto>> GetListAsync(PaginationParams pagination, CancellationToken cancellationToken);

    Task<UserListItemDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken);

    Task ChangeRoleBatchAsync(
        ChangeUsersRoleBatchRequest request,
        string currentUserId,
        CancellationToken cancellationToken);

    Task DeleteBatchAsync(IReadOnlyList<string> userIds, string currentUserId, CancellationToken cancellationToken);
}

public class UserService(
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext db,
    IProfileAttributeService profileAttributeService) : IUserService
{
    public async Task<PagedResult<UserListItemDto>> GetListAsync(
        PaginationParams pagination,
        CancellationToken cancellationToken)
    {
        var users = await userManager.Users
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var userIds = users.Select(user => user.Id).ToList();
        var nameMap = await LoadNameMapAsync(userIds, cancellationToken);
        var roleMap = await LoadRoleMapAsync(userIds, cancellationToken);

        IEnumerable<UserListItemDto> items = users
            .Select(user =>
            {
                nameMap.TryGetValue(user.Id, out var names);
                roleMap.TryGetValue(user.Id, out var role);

                return new UserListItemDto
                {
                    Id = user.Id,
                    Email = user.Email ?? string.Empty,
                    FirstName = names.FirstName,
                    LastName = names.LastName,
                    Role = role ?? string.Empty,
                };
            });

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            items = items.Where(user =>
                user.Email.Contains(search, StringComparison.OrdinalIgnoreCase)
                || user.FirstName.Contains(search, StringComparison.OrdinalIgnoreCase)
                || user.LastName.Contains(search, StringComparison.OrdinalIgnoreCase)
                || user.Role.Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        items = pagination.NormalizedSortBy switch
        {
            "firstname" => pagination.IsDescending
                ? items.OrderByDescending(user => user.FirstName)
                : items.OrderBy(user => user.FirstName),
            "lastname" => pagination.IsDescending
                ? items.OrderByDescending(user => user.LastName)
                : items.OrderBy(user => user.LastName),
            "role" => pagination.IsDescending
                ? items.OrderByDescending(user => user.Role)
                : items.OrderBy(user => user.Role),
            "id" => pagination.IsDescending
                ? items.OrderByDescending(user => user.Id)
                : items.OrderBy(user => user.Id),
            _ => pagination.IsDescending
                ? items.OrderByDescending(user => user.Email)
                : items.OrderBy(user => user.Email),
        };

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
        };
    }

    public async Task ChangeRoleBatchAsync(
        ChangeUsersRoleBatchRequest request,
        string currentUserId,
        CancellationToken cancellationToken)
    {
        if (!Roles.All.Contains(request.Role))
        {
            throw new InvalidOperationException("error.auth.invalidRole");
        }

        var distinctIds = request.UserIds.Distinct().ToList();

        if (distinctIds.Contains(currentUserId))
        {
            throw new InvalidOperationException("error.users.cannotChangeOwnRole");
        }

        foreach (var userId in distinctIds)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                throw new InvalidOperationException("error.users.notFound");
            }

            await ReplaceRolesAsync(user, request.Role);
        }
    }

    public async Task DeleteBatchAsync(
        IReadOnlyList<string> userIds,
        string currentUserId,
        CancellationToken cancellationToken)
    {
        var distinctIds = userIds.Distinct().ToList();

        if (distinctIds.Contains(currentUserId))
        {
            throw new InvalidOperationException("error.users.cannotDeleteSelf");
        }

        foreach (var userId in distinctIds)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                throw new InvalidOperationException("error.users.notFound");
            }

            var result = await userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(string.Join(" ", result.Errors.Select(error => error.Description)));
            }
        }
    }

    private async Task ReplaceRolesAsync(ApplicationUser user, string role)
    {
        var currentRoles = await userManager.GetRolesAsync(user);
        if (currentRoles.Count > 0)
        {
            await userManager.RemoveFromRolesAsync(user, currentRoles);
        }

        await userManager.AddToRoleAsync(user, role);
    }

    private async Task<Dictionary<string, (string FirstName, string LastName)>> LoadNameMapAsync(
        List<string> userIds,
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

        // Avoid Contains(string[]) — MySql.EntityFrameworkCore 10 fails type mapping for string collections.
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
                        ?.ValueString ?? string.Empty
                    : string.Empty;
                var lastName = lastNameId.HasValue
                    ? relevantAttributes
                        .FirstOrDefault(item => item.CandidateId == userId && item.AttributeId == lastNameId.Value)
                        ?.ValueString ?? string.Empty
                    : string.Empty;

                return (firstName, lastName);
            });
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
