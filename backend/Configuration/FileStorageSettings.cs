namespace Backend.Api.Configuration;

public class FileStorageSettings
{
    public const string SectionName = "FileStorage";

    public const long DefaultMaxFileSizeBytes = 10 * 1024 * 1024;

    public string RootPath { get; set; } = "uploads";

    public string RequestPath { get; set; } = "/uploads";

    public long MaxFileSizeBytes { get; set; } = DefaultMaxFileSizeBytes;
}
