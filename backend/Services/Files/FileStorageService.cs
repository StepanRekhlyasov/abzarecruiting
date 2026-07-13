using System.Text;
using System.Text.RegularExpressions;
using Backend.Api.Configuration;
using Backend.Api.Data;
using Microsoft.Extensions.Options;
using FileEntity = Backend.Api.Data.Entities.File;

namespace Backend.Api.Services.Files;

public enum UploadKind
{
    Image,
    File,
}

public record UploadedFileDto(Guid Uid, string Url, string Name, string ContentType, long Size);

public interface IFileStorageService
{
    Task<UploadedFileDto> SaveAsync(IFormFile file, UploadKind kind, CancellationToken cancellationToken = default);
}

public class FileStorageService(
    IOptions<FileStorageSettings> options,
    IWebHostEnvironment environment,
    ApplicationDbContext db) : IFileStorageService
{
    private static readonly Regex ConsecutiveUnderscores = new("_{2,}", RegexOptions.Compiled);

    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/svg+xml",
    };

    private readonly FileStorageSettings _settings = options.Value;

    public async Task<UploadedFileDto> SaveAsync(
        IFormFile file,
        UploadKind kind,
        CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0)
        {
            throw new InvalidOperationException("error.files.empty");
        }

        if (file.Length > _settings.MaxFileSizeBytes)
        {
            throw new InvalidOperationException("error.files.tooLarge");
        }

        var contentType = string.IsNullOrWhiteSpace(file.ContentType)
            ? "application/octet-stream"
            : file.ContentType;

        if (kind == UploadKind.Image && !AllowedImageContentTypes.Contains(contentType))
        {
            throw new InvalidOperationException("error.files.invalidImageType");
        }

        var originalFileName = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(originalFileName))
        {
            throw new InvalidOperationException("error.files.invalidName");
        }

        var safeFileName = SanitizeFileName(originalFileName);
        var extension = Path.GetExtension(safeFileName);
        var uid = Guid.NewGuid();
        var storedName = $"{uid:N}{extension}";
        var relativeFolder = Path.Combine(
            DateTime.UtcNow.ToString("yyyy"),
            DateTime.UtcNow.ToString("MM"));

        var rootPath = ResolveRootPath();
        var absoluteFolder = Path.Combine(rootPath, relativeFolder);
        Directory.CreateDirectory(absoluteFolder);

        var absolutePath = Path.Combine(absoluteFolder, storedName);
        await using (var stream = System.IO.File.Create(absolutePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var requestPath = _settings.RequestPath.TrimEnd('/');
        var url = $"{requestPath}/{relativeFolder.Replace('\\', '/')}/{storedName}";

        db.Files.Add(new FileEntity
        {
            Uid = uid,
            Url = url,
            Name = safeFileName,
        });
        await db.SaveChangesAsync(cancellationToken);

        return new UploadedFileDto(uid, url, safeFileName, contentType, file.Length);
    }

    private string ResolveRootPath()
    {
        if (Path.IsPathRooted(_settings.RootPath))
        {
            return _settings.RootPath;
        }

        return Path.GetFullPath(Path.Combine(environment.ContentRootPath, _settings.RootPath));
    }

    private static string SanitizeFileName(string fileName)
    {
        var normalized = fileName.Trim();
        var invalidChars = Path.GetInvalidFileNameChars();
        var builder = new StringBuilder(normalized.Length);

        foreach (var character in normalized)
        {
            builder.Append(invalidChars.Contains(character) || character is '"' or '\'' ? '_' : character);
        }

        var sanitized = ConsecutiveUnderscores.Replace(builder.ToString(), "_").Trim('.', ' ', '_');
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            return "file";
        }

        return sanitized.Length <= 180 ? sanitized : sanitized[..180];
    }
}
