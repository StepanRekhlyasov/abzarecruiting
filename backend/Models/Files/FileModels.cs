namespace Backend.Api.Models.Files;

public class UploadFileResponse
{
    public required Guid Uid { get; init; }

    public required string Url { get; init; }

    public required string Name { get; init; }

    public required string ContentType { get; init; }

    public required long Size { get; init; }
}

public class FileAttributeValueDto
{
    public required Guid Uid { get; init; }

    public required string Url { get; init; }

    public required string Name { get; init; }
}
