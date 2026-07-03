using Backend.Api.Data.Relations;

namespace Backend.Api.Data.Entities;

public class Attribute
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ValueType { get; set; } = string.Empty;
    public string InputType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string CreatedById { get; set; } = string.Empty;
    public ApplicationUser CreatedBy { get; set; } = null!;
    public ICollection<ProfileAttribute> ProfileAttributes { get; set; } = [];
    public ICollection<PositionRestriction> PositionRestrictions { get; set; } = [];
    public ICollection<PositionAttribute> PositionAttributes { get; set; } = [];
}
