using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Project;
using Backend.Api.Services.Project;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/project")]
[Authorize]
public class ProjectController(IProjectService projectService, ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<ProjectDto>>> GetList(
        [FromQuery] PaginationParams pagination,
        [FromQuery] string? candidateId,
        CancellationToken cancellationToken)
    {
        if (!User.IsAdmin() && !User.IsCandidate())
        {
            return Forbid();
        }

        var result = await projectService.GetListForViewerAsync(
            pagination,
            User.GetUserId()!,
            User.IsAdmin(),
            candidateId,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProjectDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var project = await db.ProfileProjects.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        if (!projectService.CanAccess(project, User.GetUserId(), User.IsAdmin()))
        {
            return Forbid();
        }

        var dto = await projectService.GetByIdAsync(id, cancellationToken);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create(
        [FromBody] CreateProjectRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.IsAdmin() && !User.IsCandidate())
        {
            return Forbid();
        }

        var project = await projectService.CreateAsync(request, User.GetUserId()!, User.IsAdmin(), cancellationToken);
        return project is null ? BadRequest(new { message = "Invalid candidate." }) : Ok(project);
    }

    [HttpPost("{id:int}")]
    public async Task<ActionResult<ProjectDto>> Update(
        int id,
        [FromBody] UpdateProjectRequest request,
        CancellationToken cancellationToken)
    {
        var project = await db.ProfileProjects.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        if (!projectService.CanAccess(project, User.GetUserId(), User.IsAdmin()))
        {
            return Forbid();
        }

        var updated = await projectService.UpdateAsync(id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var project = await db.ProfileProjects.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        if (!projectService.CanAccess(project, User.GetUserId(), User.IsAdmin()))
        {
            return Forbid();
        }

        var deleted = await projectService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:int}/tags/{tagId:int}")]
    public async Task<IActionResult> UpsertTag(int id, int tagId, CancellationToken cancellationToken)
    {
        var project = await db.ProfileProjects.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        if (!projectService.CanAccess(project, User.GetUserId(), User.IsAdmin()))
        {
            return Forbid();
        }

        var updated = await projectService.UpsertTagAsync(id, tagId, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id:int}/tags/{tagId:int}")]
    public async Task<IActionResult> DeleteTag(int id, int tagId, CancellationToken cancellationToken)
    {
        var project = await db.ProfileProjects.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        if (!projectService.CanAccess(project, User.GetUserId(), User.IsAdmin()))
        {
            return Forbid();
        }

        var deleted = await projectService.DeleteTagAsync(id, tagId, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
