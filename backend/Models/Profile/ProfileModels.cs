namespace Backend.Api.Models.Profile;

public class ProfileAttributeDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string ValueType { get; set; } = string.Empty;

    public string InputType { get; set; } = string.Empty;

    public string? Value { get; set; }
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
