using Backend.Api.Data;
using Backend.Api.Models.Profile;
using Backend.Api.Services.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
public class ProfileController(IProfileService profileService) : ControllerBase
{
    [HttpGet("{candidateId}")]
    public async Task<ActionResult<ProfileDto>> GetByCandidateId(string candidateId, CancellationToken cancellationToken)
    {
        var profile = await profileService.GetByCandidateIdAsync(candidateId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }
}
