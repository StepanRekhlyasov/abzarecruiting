using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models.Project;

public class CreateProjectRequest
{
    public string? CandidateId { get; set; }

    [Required]
    [MaxLength(256)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public DateTime StartAt { get; set; }

    public DateTime? EndAt { get; set; }
}

public class UpdateProjectRequest
{
    [Required]
    [MaxLength(256)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public DateTime StartAt { get; set; }

    public DateTime? EndAt { get; set; }
}

public class ProjectTagDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;
}

public class ProjectDto
{
    public int Id { get; set; }

    public string CandidateId { get; set; } = string.Empty;

    public string CandidateName { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public DateTime StartAt { get; set; }

    public DateTime? EndAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public IReadOnlyList<ProjectTagDto> Tags { get; set; } = [];
}

public class SyncProjectTagsRequest
{
    public IList<int> TagIds { get; set; } = [];
}

public class DeleteProjectsRequest
{
    [Required]
    [MinLength(1)]
    public IList<int> Ids { get; set; } = [];
}
