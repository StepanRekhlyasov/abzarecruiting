using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Resume;
using Backend.Api.Services.Resume;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResumeEntity = Backend.Api.Data.Entities.Resume;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/resume")]
public class ResumeController(IResumeService resumeService, ApplicationDbContext db) : ControllerBase
{
    [Authorize(Roles = Roles.Candidate)]
    [HttpPost("position/{positionId:int}")]
    public async Task<ActionResult<ResumeDto>> Create(int positionId, CancellationToken cancellationToken)
    {
        var resume = await resumeService.CreateAsync(positionId, User.GetUserId()!, cancellationToken);
        return resume is null ? NotFound() : Ok(resume);
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpGet]
    public async Task<ActionResult<PagedResult<ResumeListItemDto>>> GetList(
        [FromQuery] int positionId,
        [FromQuery] PaginationParams pagination,
        CancellationToken cancellationToken)
    {
        var result = await resumeService.GetListByPositionAsync(positionId, pagination, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ResumeDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var resume = await db.Resumes.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (resume is null)
        {
            return NotFound();
        }

        if (!resumeService.CanView(resume, User.GetUserId(), User.IsAdmin(), User.IsRecruiter()))
        {
            return Forbid();
        }

        var dto = await resumeService.GetByIdAsync(id, cancellationToken);
        return dto is null ? NotFound() : Ok(dto);
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
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
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

        var deleted = await resumeService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
