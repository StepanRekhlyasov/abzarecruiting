using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.User;
using Backend.Api.Services.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/user")]
public class UserController(IUserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<UserListItemDto>>> GetList(
        [FromQuery] PaginationParams pagination,
        CancellationToken cancellationToken)
    {
        var result = await userService.GetListAsync(pagination, cancellationToken);
        return Ok(result);
    }

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

    [HttpPost("role")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> ChangeRoleBatch(
        [FromBody] ChangeUsersRoleBatchRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await userService.ChangeRoleBatchAsync(request, User.GetUserId()!, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteBatch(
        [FromBody] DeleteUsersRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await userService.DeleteBatchAsync(request.UserIds, User.GetUserId()!, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
