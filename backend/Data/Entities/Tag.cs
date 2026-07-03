using Backend.Api.Data.Relations;

namespace Backend.Api.Data.Entities;

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string CreatedById { get; set; } = string.Empty;
    public ApplicationUser CreatedBy { get; set; } = null!;
    public ICollection<ProjectTag> ProjectTags { get; set; } = [];
    public ICollection<PositionTag> PositionTags { get; set; } = [];
}
