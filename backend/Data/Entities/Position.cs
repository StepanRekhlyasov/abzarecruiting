using Backend.Api.Data.Enums;
using Backend.Api.Data.Relations;

namespace Backend.Api.Data.Entities;

public class Position
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public PositionLevel Level { get; set; }
    public WorkFormat Format { get; set; }
    public int MaxProjects { get; set; }
    public DateTime CreatedAt { get; set; }
    public int Version { get; set; }
    public string CreatedById { get; set; } = string.Empty;
    public ApplicationUser CreatedBy { get; set; } = null!;
    public ICollection<PositionRestriction> PositionRestrictions { get; set; } = [];
    public ICollection<PositionAttribute> PositionAttributes { get; set; } = [];
    public ICollection<Resume> Resumes { get; set; } = [];
    public ICollection<PositionTag> PositionTags { get; set; } = [];
    public ICollection<PositionMessage> Messages { get; set; } = [];
}
