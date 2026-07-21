using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.User;
using Backend.Api.Services.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/user")]
public class UserController(IUserService userService) : ControllerBase
{
    [Authorize(Roles = $"{Roles.Admin},{Roles.Recruiter}")]
    [HttpGet]
    public async Task<ActionResult<PagedResult<UserListItemDto>>> GetList(
        [FromQuery] PaginationParams pagination,
        [FromQuery] string? role,
        [FromQuery] bool? isLockedOut,
        [FromQuery] bool? emailConfirmed,
        CancellationToken cancellationToken)
    {
        var isAdmin = User.IsAdmin();
        var result = await userService.GetListAsync(
            pagination,
            candidatesOnly: User.IsRecruiter() && !isAdmin,
            includeLockedOut: isAdmin,
            role,
            isLockedOut,
            emailConfirmed,
            cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<UserListItemDto>> Create(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userService.CreateAsync(request, cancellationToken);
        return Ok(user);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("role")]
    public async Task<IActionResult> ChangeRoleBatch(
        [FromBody] ChangeUsersRoleBatchRequest request,
        CancellationToken cancellationToken)
    {
        await userService.ChangeRoleBatchAsync(request, cancellationToken);
        return NoContent();
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteBatch(
        [FromBody] DeleteUsersRequest request,
        CancellationToken cancellationToken)
    {
        await userService.DeleteBatchAsync(request.UserIds, cancellationToken);
        return NoContent();
    }

    [HttpGet("{userId}/rewards")]
    public async Task<ActionResult<UserRewardsDto>> GetRewards(
        string userId,
        CancellationToken cancellationToken)
    {
        if (!User.IsSelfOrAdmin(userId))
        {
            return Forbid();
        }

        var rewards = await userService.GetRewardsAsync(userId, cancellationToken);
        return rewards is null ? NotFound() : Ok(rewards);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{userId}/lockout")]
    public async Task<IActionResult> SetLockout(
        string userId,
        [FromBody] SetUserLockoutRequest request,
        CancellationToken cancellationToken)
    {
        await userService.SetLockoutAsync(userId, request.Locked, cancellationToken);
        return NoContent();
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{userId}/activation")]
    public async Task<IActionResult> SetActivation(
        string userId,
        [FromBody] SetUserActivationRequest request,
        CancellationToken cancellationToken)
    {
        await userService.SetActivationAsync(userId, request.Activated, cancellationToken);
        return NoContent();
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{userId}/send-activation")]
    public async Task<IActionResult> SendActivationEmail(
        string userId,
        [FromBody] SendActivationEmailRequest request,
        CancellationToken cancellationToken)
    {
        await userService.SendActivationEmailAsync(userId, request.FrontendBaseUrl, cancellationToken);
        return NoContent();
    }
}
