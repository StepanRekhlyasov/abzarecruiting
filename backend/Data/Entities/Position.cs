using Backend.Api.Data.Relations;

namespace Backend.Api.Data.Entities;

public class Position
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public string CreatedById { get; set; } = string.Empty;

    public ApplicationUser CreatedBy { get; set; } = null!;

    public ICollection<PositionRestriction> PositionRestrictions { get; set; } = [];

    public ICollection<Resume> Resumes { get; set; } = [];

    public ICollection<PositionTag> PositionTags { get; set; } = [];
}
