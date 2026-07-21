using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Attribute;
using Backend.Api.Models.Profile;
using Backend.Api.Services.Attribute;
using Backend.Api.Services.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/profile")]
public class ProfileController(IProfileService profileService, IAttributeService attributeService) : ControllerBase
{
    [Authorize(Roles = Roles.Admin)]
    [HttpGet("{candidateId}")]
    public async Task<ActionResult<ProfileDto>> GetByCandidateId(string candidateId, CancellationToken cancellationToken)
    {
        var profile = await profileService.GetByCandidateIdAsync(candidateId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [Authorize]
    [HttpGet("{candidateId}/me")]
    public async Task<ActionResult<IReadOnlyList<ProfileAttributeDto>>> GetMeInfo(
        string candidateId,
        CancellationToken cancellationToken)
    {
        if (!User.IsSelfOrAdmin(candidateId))
        {
            return Forbid();
        }

        var attributes = await profileService.GetMeInfoAsync(candidateId, cancellationToken);
        return attributes is null ? NotFound() : Ok(attributes);
    }

    [Authorize]
    [HttpGet("{candidateId}/attribute-ids")]
    public async Task<ActionResult<IReadOnlyList<int>>> GetLinkedAttributeIds(
        string candidateId,
        CancellationToken cancellationToken)
    {
        if (!User.IsSelfOrAdmin(candidateId))
        {
            return Forbid();
        }

        var attributeIds = await profileService.GetLinkedAttributeIdsAsync(candidateId, cancellationToken);
        return Ok(attributeIds);
    }

    [Authorize]
    [HttpPost("{candidateId}/add")]
    public async Task<IActionResult> AddAttributes(
        string candidateId,
        [FromBody] AddProfileAttributesRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.IsSelfOrAdmin(candidateId))
        {
            return Forbid();
        }

        var added = await profileService.AddAttributesAsync(candidateId, request.AttributeIds, cancellationToken);
        return added ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpPost("{candidateId}/remove")]
    public async Task<IActionResult> RemoveAttributes(
        string candidateId,
        [FromBody] RemoveProfileAttributesRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.IsSelfOrAdmin(candidateId))
        {
            return Forbid();
        }

        var removed = await profileService.RemoveAttributesAsync(candidateId, request.AttributeIds, cancellationToken);
        return removed ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpPost("{candidateId}/values")]
    public async Task<ActionResult<IReadOnlyList<SetProfileAttributeBatchResultItem>>> SetCandidateValuesBatch(
        string candidateId,
        [FromBody] SetProfileAttributesBatchRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.IsSelfOrAdmin(candidateId))
        {
            return Forbid();
        }

        var results = await attributeService.SetCandidateValuesBatchAsync(
            candidateId,
            request.Items,
            cancellationToken);
        return Ok(results);
    }
}
