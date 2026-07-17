using System.ComponentModel.DataAnnotations;
using Backend.Api.Models.Profile;
using Backend.Api.Models.Project;

namespace Backend.Api.Models.Resume;

public class CreateResumeRequest
{
    [Required]
    public int PositionId { get; set; }

    public string? CandidateId { get; set; }
}

public class CreateResumesBatchRequest
{
    [Required]
    [MinLength(1)]
    public IList<int> PositionIds { get; set; } = [];

    public string? CandidateId { get; set; }
}

public class DeleteResumeItem
{
    public int Id { get; set; }

    public int Version { get; set; }
}

public class DeleteResumesRequest
{
    [Required]
    [MinLength(1)]
    public IList<DeleteResumeItem> Items { get; set; } = [];
}

public class UpdateResumeRequest
{
    [Required]
    public bool Published { get; set; }

    public int Version { get; set; }
}

public class ResumeCandidateAttributeDto
{
    public string Name { get; set; } = string.Empty;

    public object? Value { get; set; }
}

public class ResumeDto
{
    public int Id { get; set; }

    public string CandidateId { get; set; } = string.Empty;

    public string CandidateName { get; set; } = string.Empty;

    public int PositionId { get; set; }

    public string PositionName { get; set; } = string.Empty;

    public int MaxProjects { get; set; }

    public bool Published { get; set; }

    public DateTime CreatedAt { get; set; }

    public int Version { get; set; }

    public int LikesCount { get; set; }

    public bool LikedByCurrentUser { get; set; }

    public IReadOnlyList<ResumeCandidateAttributeDto> CandidateAttributes { get; set; } = [];

    public IReadOnlyList<ProfileAttributeDto> Attributes { get; set; } = [];

    public IReadOnlyList<ProjectDto> Projects { get; set; } = [];
}

public class ResumeListItemDto : ResumeDto;

public class ResumeLikeStateDto
{
    public int LikesCount { get; set; }

    public bool LikedByCurrentUser { get; set; }
}

public sealed class ResumeGetResult
{
    private ResumeGetResult(ResumeDto? dto, bool notFound, bool forbidden)
    {
        Dto = dto;
        NotFound = notFound;
        Forbidden = forbidden;
    }

    public ResumeDto? Dto { get; }

    public bool NotFound { get; }

    public bool Forbidden { get; }

    public static ResumeGetResult NotFoundResult() => new(null, true, false);

    public static ResumeGetResult ForbiddenResult() => new(null, false, true);

    public static ResumeGetResult Ok(ResumeDto dto) => new(dto, false, false);
}

public sealed class ResumePdfResult
{
    private ResumePdfResult(byte[]? content, string? fileName, bool notFound, bool forbidden, bool notPublished)
    {
        Content = content;
        FileName = fileName;
        NotFound = notFound;
        Forbidden = forbidden;
        NotPublished = notPublished;
    }

    public byte[]? Content { get; }

    public string? FileName { get; }

    public bool NotFound { get; }

    public bool Forbidden { get; }

    public bool NotPublished { get; }

    public static ResumePdfResult NotFoundResult() => new(null, null, true, false, false);

    public static ResumePdfResult ForbiddenResult() => new(null, null, false, true, false);

    public static ResumePdfResult NotPublishedResult() => new(null, null, false, false, true);

    public static ResumePdfResult Ok(byte[] content, string fileName) =>
        new(content, fileName, false, false, false);
}
