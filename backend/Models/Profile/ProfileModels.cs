using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models.Profile;

public class ProfileAttributeDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string ValueType { get; set; } = string.Empty;

    public string InputType { get; set; } = string.Empty;

    public IList<string> Options { get; set; } = [];

    public string? Value { get; set; }

    public int Version { get; set; }

    public bool IsDefault { get; set; }
}

public class ProfileProjectTagDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;
}

public class ProfileProjectDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public DateTime StartAt { get; set; }

    public DateTime? EndAt { get; set; }

    public IReadOnlyList<ProfileProjectTagDto> Tags { get; set; } = [];
}

public class ProfileDto
{
    public string CandidateId { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public IReadOnlyList<ProfileAttributeDto> Attributes { get; set; } = [];

    public IReadOnlyList<ProfileProjectDto> Projects { get; set; } = [];
}

public class AddProfileAttributesRequest
{
    [Required]
    [MinLength(1)]
    public IList<int> AttributeIds { get; set; } = [];
}

public class RemoveProfileAttributesRequest
{
    [Required]
    [MinLength(1)]
    public IList<int> AttributeIds { get; set; } = [];
}
