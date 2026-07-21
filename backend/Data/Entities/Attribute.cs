using Backend.Api.Data;
using Backend.Api.Data.Relations;

namespace Backend.Api.Data.Entities;

public class Attribute
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = AttributeCategories.PersonalInformation;
    public string ValueType { get; set; } = string.Empty;
    public string InputType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int Version { get; set; }
    public string? CreatedById { get; set; }
    public ApplicationUser? CreatedBy { get; set; }
    public ICollection<AttributeOption> Options { get; set; } = [];
    public ICollection<AttributeValidation> Validations { get; set; } = [];
    public ICollection<ProfileAttribute> ProfileAttributes { get; set; } = [];
    public ICollection<PositionRestriction> PositionRestrictions { get; set; } = [];
    public ICollection<PositionAttribute> PositionAttributes { get; set; } = [];
}
