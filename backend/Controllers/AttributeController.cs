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
        [FromQuery] AttributeListParams pagination,
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
    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteBatch(
        [FromBody] DeleteAttributesRequest request,
        CancellationToken cancellationToken)
    {
        await attributeService.DeleteBatchAsync(request.Items, cancellationToken);
        return NoContent();
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] int version, CancellationToken cancellationToken)
    {
        var deleted = await attributeService.DeleteAsync(id, version, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpPost("{id:int}/candidate/{candidateId}")]
    public async Task<IActionResult> SetCandidateValue(
        int id,
        string candidateId,
        [FromBody] SetProfileAttributeRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.IsSelfOrAdmin(candidateId))
        {
            return Forbid();
        }

        var version = await attributeService.SetCandidateValueAsync(id, candidateId, request, cancellationToken);
        return version is null ? NotFound() : Ok(new { version });
    }

    [Authorize]
    [HttpDelete("{id:int}/candidate/{candidateId}")]
    public async Task<IActionResult> DeleteCandidateValue(
        int id,
        string candidateId,
        CancellationToken cancellationToken)
    {
        if (!User.IsSelfOrAdmin(candidateId))
        {
            return Forbid();
        }

        var deleted = await attributeService.DeleteCandidateValueAsync(id, candidateId, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
