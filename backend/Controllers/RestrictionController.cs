using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Restriction;
using Backend.Api.Services.Restriction;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/restrictions")]
[Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
public class RestrictionController(IRestrictionService restrictionService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RestrictionDto>>> GetByPositionId(
        [FromQuery] int positionId,
        CancellationToken cancellationToken)
    {
        var items = await restrictionService.GetByPositionIdAsync(positionId, cancellationToken);
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<RestrictionDto>> Create(
        [FromBody] CreateRestrictionRequest request,
        CancellationToken cancellationToken)
    {
        var restriction = await restrictionService.CreateAsync(request, User.GetUserId()!, cancellationToken);
        return restriction is null ? NotFound() : Ok(restriction);
    }

    [HttpPut("sync")]
    public async Task<ActionResult<IReadOnlyList<RestrictionDto>>> Sync(
        [FromBody] SyncRestrictionsRequest request,
        CancellationToken cancellationToken)
    {
        var items = await restrictionService.SyncAsync(request, User.GetUserId()!, cancellationToken);
        return Ok(items);
    }

    [HttpPost("{id:int}")]
    public async Task<ActionResult<RestrictionDto>> Update(
        int id,
        [FromBody] UpdateRestrictionRequest request,
        CancellationToken cancellationToken)
    {
        var restriction = await restrictionService.UpdateAsync(id, request, cancellationToken);
        return restriction is null ? NotFound() : Ok(restriction);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] int version, CancellationToken cancellationToken)
    {
        var deleted = await restrictionService.DeleteAsync(id, version, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
