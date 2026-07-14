using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Tag;
using Backend.Api.Services.Tag;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/tag")]
public class TagController(ITagService tagService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<PagedResult<TagDto>>> GetList(
        [FromQuery] TagListParams pagination,
        CancellationToken cancellationToken)
    {
        var result = await tagService.GetListAsync(pagination, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<TagDto>> Create(
        [FromBody] CreateTagRequest request,
        CancellationToken cancellationToken)
    {
        var tag = await tagService.CreateAsync(request, User.GetUserId()!, cancellationToken);
        return Ok(tag);
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpPost("{id:int}")]
    public async Task<ActionResult<TagDto>> Update(
        int id,
        [FromBody] UpdateTagRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var tag = await tagService.UpdateAsync(id, request, cancellationToken);
            return tag is null ? NotFound() : Ok(tag);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [Authorize(Roles = $"{Roles.Recruiter},{Roles.Admin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] int version, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await tagService.DeleteAsync(id, version, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
