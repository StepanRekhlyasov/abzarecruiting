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
    [HttpPost]
    public async Task<ActionResult<RestrictionDto>> Create(
        [FromBody] CreateRestrictionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var restriction = await restrictionService.CreateAsync(request, User.GetUserId()!, cancellationToken);
            return restriction is null ? NotFound() : Ok(restriction);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("{id:int}")]
    public async Task<ActionResult<RestrictionDto>> Update(
        int id,
        [FromBody] UpdateRestrictionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var restriction = await restrictionService.UpdateAsync(id, request, cancellationToken);
            return restriction is null ? NotFound() : Ok(restriction);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await restrictionService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
