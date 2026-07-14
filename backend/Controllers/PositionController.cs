using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Position;
using Backend.Api.Services.Position;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/position")]
public class PositionController(IPositionService positionService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<PagedResult<PositionListItemDto>>> GetList(
        [FromQuery] PaginationParams pagination,
        CancellationToken cancellationToken)
    {
        var result = await positionService.GetListAsync(pagination, User, cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpPost("{id:int}/attributes/{attributeId:int}")]
    public async Task<IActionResult> UpsertAttribute(
        int id,
        int attributeId,
        [FromBody] PositionRelationRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await positionService.UpsertAttributeAsync(id, attributeId, request, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpDelete("{id:int}/attributes/{attributeId:int}")]
    public async Task<IActionResult> DeleteAttribute(int id, int attributeId, CancellationToken cancellationToken)
    {
        var deleted = await positionService.DeleteAttributeAsync(id, attributeId, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpPost("{id:int}/tags/{tagId:int}")]
    public async Task<IActionResult> UpsertTag(
        int id,
        int tagId,
        [FromBody] PositionRelationRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await positionService.UpsertTagAsync(id, tagId, request, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpDelete("{id:int}/tags/{tagId:int}")]
    public async Task<IActionResult> DeleteTag(int id, int tagId, CancellationToken cancellationToken)
    {
        var deleted = await positionService.DeleteTagAsync(id, tagId, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PositionDetailDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var position = await positionService.GetByIdAsync(id, User, cancellationToken);
        return position is null ? NotFound() : Ok(position);
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpPost]
    public async Task<ActionResult<PositionDetailDto>> Create(
        [FromBody] CreatePositionRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId()!;
        var position = await positionService.CreateAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = position.Id }, position);
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpPost("{id:int}")]
    public async Task<ActionResult<PositionDetailDto>> Update(
        int id,
        [FromBody] UpdatePositionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var position = await positionService.UpdateAsync(id, request, cancellationToken);
            return position is null ? NotFound() : Ok(position);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpPost("{id:int}/duplicate")]
    public async Task<ActionResult<PositionDetailDto>> Duplicate(int id, CancellationToken cancellationToken)
    {
        var position = await positionService.DuplicateAsync(id, User.GetUserId()!, cancellationToken);
        return position is null ? NotFound() : CreatedAtAction(nameof(GetById), new { id = position.Id }, position);
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] int version, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await positionService.DeleteAsync(id, version, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
