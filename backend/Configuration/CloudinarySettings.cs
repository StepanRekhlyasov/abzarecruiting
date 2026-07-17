namespace Backend.Api.Configuration;

public class CloudinarySettings
{
    public const string SectionName = "Cloudinary";

    public const long DefaultMaxFileSizeBytes = 10 * 1024 * 1024;

    public string CloudName { get; set; } = string.Empty;

    public string ApiKey { get; set; } = string.Empty;

    public string ApiSecret { get; set; } = string.Empty;

    /// <summary>Asset folder in Media Library (dynamic folders mode).</summary>
    public string AssetFolder { get; set; } = "abza";

    /// <summary>Optional upload preset (e.g. ml_default). Signed server uploads work without it.</summary>
    public string? UploadPreset { get; set; }

    public long MaxFileSizeBytes { get; set; } = DefaultMaxFileSizeBytes;
}
