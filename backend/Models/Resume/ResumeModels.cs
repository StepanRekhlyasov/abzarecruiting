using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models.Resume;

public class UpdateResumeRequest
{
    [Required]
    public bool Published { get; set; }

    public int Version { get; set; }
}

public class ResumeCandidateAttributeDto
{
    public string Name { get; set; } = string.Empty;

    public string? Value { get; set; }
}

public class ResumeDto
{
    public int Id { get; set; }

    public string CandidateId { get; set; } = string.Empty;

    public int PositionId { get; set; }

    public bool Published { get; set; }

    public DateTime CreatedAt { get; set; }

    public int Version { get; set; }

    public IReadOnlyList<ResumeCandidateAttributeDto> CandidateAttributes { get; set; } = [];
}

public class ResumeListItemDto : ResumeDto;

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
