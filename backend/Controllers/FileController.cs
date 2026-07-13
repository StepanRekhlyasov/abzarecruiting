using Backend.Api.Configuration;
using Backend.Api.Models.Files;
using Backend.Api.Services.Files;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/files")]
public class FileController(IFileStorageService fileStorageService) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(FileStorageSettings.DefaultMaxFileSizeBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = FileStorageSettings.DefaultMaxFileSizeBytes)]
    public async Task<ActionResult<UploadFileResponse>> Upload(
        IFormFile? file,
        [FromQuery] string kind = "file",
        CancellationToken cancellationToken = default)
    {
        if (file is null)
        {
            return BadRequest(new { message = "error.files.missing" });
        }

        if (!TryParseKind(kind, out var uploadKind))
        {
            return BadRequest(new { message = "error.files.unsupportedKind" });
        }

        try
        {
            var uploaded = await fileStorageService.SaveAsync(file, uploadKind, cancellationToken);
            return Ok(new UploadFileResponse
            {
                Uid = uploaded.Uid,
                Url = uploaded.Url,
                Name = uploaded.Name,
                ContentType = uploaded.ContentType,
                Size = uploaded.Size,
            });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    private static bool TryParseKind(string kind, out UploadKind uploadKind)
    {
        switch (kind.Trim().ToLowerInvariant())
        {
            case "image":
                uploadKind = UploadKind.Image;
                return true;
            case "file":
                uploadKind = UploadKind.File;
                return true;
            default:
                uploadKind = default;
                return false;
        }
    }
}
