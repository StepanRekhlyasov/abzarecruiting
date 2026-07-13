namespace Backend.Api.Models.Files;

public class UploadFileResponse
{
    public required string Url { get; init; }

    public required string FileName { get; init; }

    public required string ContentType { get; init; }

    public required long Size { get; init; }
}
