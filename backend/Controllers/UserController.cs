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
        CancellationToken cancellationToken)
    {
        var result = await userService.GetListAsync(
            pagination,
            candidatesOnly: User.IsRecruiter() && !User.IsAdmin(),
            cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<UserListItemDto>> Create(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = await userService.CreateAsync(request, cancellationToken);
            return Ok(user);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("role")]
    public async Task<IActionResult> ChangeRoleBatch(
        [FromBody] ChangeUsersRoleBatchRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await userService.ChangeRoleBatchAsync(request, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteBatch(
        [FromBody] DeleteUsersRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await userService.DeleteBatchAsync(request.UserIds, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
