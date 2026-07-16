using Backend.Api.Data.Relations;

namespace Backend.Api.Data.Entities;

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int Version { get; set; }
    public string? CreatedById { get; set; }
    public ApplicationUser? CreatedBy { get; set; }
    public ICollection<ProfileProjectTag> ProfileProjectTags { get; set; } = [];
    public ICollection<PositionTag> PositionTags { get; set; } = [];
    public ICollection<PositionRestriction> PositionRestrictions { get; set; } = [];
}
