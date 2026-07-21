using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Message;
using Backend.Api.Services.Message;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/position/{positionId:int}/messages")]
public class PositionMessageController(IPositionMessageService messageService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PositionMessageDto>>> GetList(
        int positionId,
        CancellationToken cancellationToken)
    {
        var messages = await messageService.GetByPositionAsync(positionId, cancellationToken);
        return Ok(messages);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<PositionMessageDto>> Create(
        int positionId,
        [FromBody] CreatePositionMessageRequest request,
        CancellationToken cancellationToken)
    {
        var message = await messageService.CreateAsync(
            positionId,
            request,
            User.GetUserId()!,
            cancellationToken);
        return message is null ? NotFound() : Ok(message);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{messageId:int}")]
    public async Task<IActionResult> Delete(
        int positionId,
        int messageId,
        CancellationToken cancellationToken)
    {
        var deleted = await messageService.DeleteAsync(positionId, messageId, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
