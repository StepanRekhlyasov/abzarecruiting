using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Resume;
using Backend.Api.Services.Resume;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/resume")]
public class ResumeController(IResumeService resumeService, ApplicationDbContext db) : ControllerBase
{
    [Authorize(Roles = Roles.Candidate)]
    [HttpPost("position/{positionId:int}")]
    public async Task<ActionResult<ResumeDto>> Create(int positionId, CancellationToken cancellationToken)
    {
        try
        {
            var resume = await resumeService.CreateAsync(positionId, User.GetUserId()!, cancellationToken);
            return resume is null ? NotFound() : Ok(resume);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [Authorize(Roles = Roles.Candidate)]
    [HttpGet("position-ids")]
    public async Task<ActionResult<IReadOnlyList<int>>> GetMyPositionIds(CancellationToken cancellationToken)
    {
        var positionIds = await resumeService.GetPositionIdsForCandidateAsync(
            User.GetUserId()!,
            cancellationToken);
        return Ok(positionIds);
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<PagedResult<ResumeListItemDto>>> GetList(
        [FromQuery] PaginationParams pagination,
        [FromQuery] int? positionId,
        CancellationToken cancellationToken)
    {
        if (positionId.HasValue)
        {
            if (!User.IsRecruiterOrAdmin())
            {
                return Forbid();
            }

            var byPosition = await resumeService.GetListByPositionAsync(
                positionId.Value,
                pagination,
                cancellationToken);
            return Ok(byPosition);
        }

        var result = await resumeService.GetListForViewerAsync(
            pagination,
            User.GetUserId()!,
            User.IsAdmin(),
            User.IsRecruiter(),
            cancellationToken);

        return Ok(result);
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ResumeDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await resumeService.GetByIdForViewerAsync(
            id,
            User.GetUserId(),
            User.IsAdmin(),
            User.IsRecruiter(),
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound();
        }

        if (result.Forbidden)
        {
            return Forbid();
        }

        return Ok(result.Dto);
    }

    [Authorize]
    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(
        int id,
        [FromQuery] string? lang,
        CancellationToken cancellationToken)
    {
        var result = await resumeService.GeneratePdfForViewerAsync(
            id,
            User.GetUserId(),
            User.IsAdmin(),
            User.IsRecruiter(),
            lang,
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound();
        }

        if (result.Forbidden)
        {
            return Forbid();
        }

        if (result.NotPublished)
        {
            return BadRequest(new { message = "error.resumes.notPublished" });
        }

        return File(result.Content!, "application/pdf", result.FileName);
    }

    [Authorize]
    [HttpPost("{id:int}")]
    public async Task<ActionResult<ResumeDto>> Update(
        int id,
        [FromBody] UpdateResumeRequest request,
        CancellationToken cancellationToken)
    {
        var resume = await db.Resumes.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (resume is null)
        {
            return NotFound();
        }

        if (!resumeService.CanModify(resume, User.GetUserId(), User.IsAdmin()))
        {
            return Forbid();
        }

        try
        {
            var updated = await resumeService.UpdateAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] int version, CancellationToken cancellationToken)
    {
        var resume = await db.Resumes.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (resume is null)
        {
            return NotFound();
        }

        if (!resumeService.CanModify(resume, User.GetUserId(), User.IsAdmin()))
        {
            return Forbid();
        }

        try
        {
            var deleted = await resumeService.DeleteAsync(id, version, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
