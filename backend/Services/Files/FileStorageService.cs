using System.Text;
using System.Text.RegularExpressions;
using Backend.Api.Configuration;
using Backend.Api.Data;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
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
    Task<UploadedFileDto> SaveAsync(
        IFormFile file,
        UploadKind kind,
        Guid? uid = null,
        CancellationToken cancellationToken = default);
}

public class FileStorageService(
    Cloudinary cloudinary,
    IOptions<CloudinarySettings> options,
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

    private readonly CloudinarySettings _settings = options.Value;

    public async Task<UploadedFileDto> SaveAsync(
        IFormFile file,
        UploadKind kind,
        Guid? uid = null,
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
        var fileUid = uid ?? Guid.NewGuid();
        var publicId = fileUid.ToString("N");
        var assetFolder = string.IsNullOrWhiteSpace(_settings.AssetFolder)
            ? null
            : _settings.AssetFolder.Trim().Trim('/');

        await using var stream = file.OpenReadStream();
        var fileDescription = new FileDescription(safeFileName, stream);

        UploadResult uploadResult = kind == UploadKind.Image
            ? await UploadImageAsync(fileDescription, publicId, assetFolder, cancellationToken)
            : await UploadRawAsync(fileDescription, publicId, assetFolder, cancellationToken);

        if (uploadResult.Error is not null)
        {
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(uploadResult.Error.Message)
                    ? "error.files.upload"
                    : uploadResult.Error.Message);
        }

        var url = uploadResult.SecureUrl?.ToString()
            ?? uploadResult.Url?.ToString()
            ?? throw new InvalidOperationException("error.files.upload");

        db.Files.Add(new FileEntity
        {
            Uid = fileUid,
            Url = url,
            Name = safeFileName,
        });
        await db.SaveChangesAsync(cancellationToken);

        return new UploadedFileDto(fileUid, url, safeFileName, contentType, file.Length);
    }

    private async Task<ImageUploadResult> UploadImageAsync(
        FileDescription fileDescription,
        string publicId,
        string? assetFolder,
        CancellationToken cancellationToken)
    {
        var uploadParams = new ImageUploadParams
        {
            File = fileDescription,
            PublicId = publicId,
            Overwrite = true,
            UniqueFilename = false,
            UseFilename = false,
        };

        if (assetFolder is not null)
        {
            uploadParams.AssetFolder = assetFolder;
        }

        return await cloudinary.UploadAsync(uploadParams, cancellationToken);
    }

    private async Task<RawUploadResult> UploadRawAsync(
        FileDescription fileDescription,
        string publicId,
        string? assetFolder,
        CancellationToken cancellationToken)
    {
        var uploadParams = new RawUploadParams
        {
            File = fileDescription,
            PublicId = publicId,
            Overwrite = true,
            UniqueFilename = false,
            UseFilename = false,
        };

        if (assetFolder is not null)
        {
            uploadParams.AssetFolder = assetFolder;
        }

        return await cloudinary.UploadAsync(uploadParams, "upload", cancellationToken);
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
