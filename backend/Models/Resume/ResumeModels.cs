using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models.Resume;

public class UpdateResumeRequest
{
    [Required]
    public bool Published { get; set; }
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

    public IReadOnlyList<ResumeCandidateAttributeDto> CandidateAttributes { get; set; } = [];
}

public class ResumeListItemDto : ResumeDto;
