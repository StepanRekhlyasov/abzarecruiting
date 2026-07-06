using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Attribute;
using Backend.Api.Models.Common;
using Backend.Api.Services.Attribute;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/attribute")]
public class AttributeController(IAttributeService attributeService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<PagedResult<AttributeDto>>> GetList(
        [FromQuery] PaginationParams pagination,
        CancellationToken cancellationToken)
    {
        var result = await attributeService.GetListAsync(pagination, cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpPost]
    public async Task<ActionResult<AttributeDto>> Create(
        [FromBody] CreateAttributeRequest request,
        CancellationToken cancellationToken)
    {
        var attribute = await attributeService.CreateAsync(request, User.GetUserId()!, cancellationToken);
        return Ok(attribute);
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpPost("{id:int}")]
    public async Task<ActionResult<AttributeDto>> Update(
        int id,
        [FromBody] UpdateAttributeRequest request,
        CancellationToken cancellationToken)
    {
        var attribute = await attributeService.UpdateAsync(id, request, cancellationToken);
        return attribute is null ? NotFound() : Ok(attribute);
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await attributeService.DeleteAsync(id, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [Authorize]
    [HttpPost("{id:int}/candidate/{candidateId}")]
    public async Task<IActionResult> SetCandidateValue(
        int id,
        string candidateId,
        [FromBody] SetProfileAttributeRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.IsAdmin() && User.GetUserId() != candidateId)
        {
            return Forbid();
        }

        var updated = await attributeService.SetCandidateValueAsync(id, candidateId, request, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id:int}/candidate/{candidateId}")]
    public async Task<IActionResult> DeleteCandidateValue(
        int id,
        string candidateId,
        CancellationToken cancellationToken)
    {
        if (!User.IsAdmin() && User.GetUserId() != candidateId)
        {
            return Forbid();
        }

        var deleted = await attributeService.DeleteCandidateValueAsync(id, candidateId, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
