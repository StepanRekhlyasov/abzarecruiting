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
    [Authorize(Roles = $"{Roles.Candidate},{Roles.Admin}")]
    [HttpPost]
    public async Task<ActionResult<ResumeDto>> Create(
        [FromBody] CreateResumeRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.IsAdmin() && !User.IsCandidate())
        {
            return Forbid();
        }

        var candidateId = User.IsAdmin() ? request.CandidateId : User.GetUserId();
        if (string.IsNullOrWhiteSpace(candidateId))
        {
            return BadRequest(new { message = "error.profile.notCandidate" });
        }

        var resume = await resumeService.CreateAsync(request.PositionId, candidateId, cancellationToken);
        return resume is null ? NotFound() : Ok(resume);
    }

    [Authorize(Roles = $"{Roles.Candidate},{Roles.Admin}")]
    [HttpPost("batch")]
    public async Task<ActionResult<IReadOnlyList<ResumeDto>>> CreateBatch(
        [FromBody] CreateResumesBatchRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.IsAdmin() && !User.IsCandidate())
        {
            return Forbid();
        }

        var candidateId = User.IsAdmin() ? request.CandidateId : User.GetUserId();
        if (string.IsNullOrWhiteSpace(candidateId))
        {
            return BadRequest(new { message = "error.profile.notCandidate" });
        }

        var resumes = await resumeService.CreateBatchAsync(request.PositionIds, candidateId, cancellationToken);
        return Ok(resumes);
    }

    [Authorize(Roles = Roles.Candidate)]
    [HttpPost("position/{positionId:int}")]
    public async Task<ActionResult<ResumeDto>> CreateForPosition(int positionId, CancellationToken cancellationToken)
    {
        var resume = await resumeService.CreateAsync(positionId, User.GetUserId()!, cancellationToken);
        return resume is null ? NotFound() : Ok(resume);
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
        [FromQuery] string? candidateId,
        [FromQuery] List<string>? candidateIds,
        [FromQuery] List<int>? tagIds,
        [FromQuery] bool? published,
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
                User.GetUserId(),
                User.IsAdmin(),
                cancellationToken);
            return Ok(byPosition);
        }

        if (!string.IsNullOrWhiteSpace(candidateId)
            && !User.IsAdmin()
            && !User.IsRecruiter()
            && User.GetUserId() != candidateId)
        {
            return Forbid();
        }

        if ((candidateIds?.Any(id => !string.IsNullOrWhiteSpace(id)) ?? false)
            && !User.IsRecruiterOrAdmin())
        {
            return Forbid();
        }

        var result = await resumeService.GetListForViewerAsync(
            pagination,
            User.GetUserId()!,
            User.IsAdmin(),
            User.IsRecruiter(),
            candidateId,
            tagIds,
            candidateIds,
            published,
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

    [Authorize(Roles = Roles.Recruiter)]
    [HttpPost("{id:int}/like")]
    public async Task<ActionResult<ResumeLikeStateDto>> ToggleLike(int id, CancellationToken cancellationToken)
    {
        var result = await resumeService.ToggleLikeAsync(id, User.GetUserId()!, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [Authorize]
    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(
        int id,
        [FromQuery] string? lang,
        [FromQuery] string? frontendBaseUrl,
        CancellationToken cancellationToken)
    {
        var result = await resumeService.GeneratePdfForViewerAsync(
            id,
            User.GetUserId(),
            User.IsAdmin(),
            User.IsRecruiter(),
            lang,
            frontendBaseUrl,
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

        var updated = await resumeService.UpdateAsync(id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [Authorize]
    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteBatch(
        [FromBody] DeleteResumesRequest request,
        CancellationToken cancellationToken)
    {
        var uniqueIds = request.Items.Select(item => item.Id).Distinct().ToList();
        var resumes = await db.Resumes
            .Where(item => uniqueIds.Contains(item.Id))
            .ToListAsync(cancellationToken);

        if (resumes.Count != uniqueIds.Count)
        {
            return NotFound();
        }

        if (resumes.Any(resume => !resumeService.CanModify(resume, User.GetUserId(), User.IsAdmin())))
        {
            return Forbid();
        }

        await resumeService.DeleteBatchAsync(request.Items, cancellationToken);
        return NoContent();
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

        var deleted = await resumeService.DeleteAsync(id, version, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
