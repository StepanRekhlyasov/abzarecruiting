using Backend.Api.Data;
using Backend.Api.Data.Entities;
using Backend.Api.Data.Enums;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Data.Relations;

public class PositionRestriction
{
    public int PositionId { get; set; }

    public int AttributeId { get; set; }

    public string? TargetValue { get; set; }

    public RestrictionCondition Condition { get; set; }

    public DateTime CreatedAt { get; set; }

    public string CreatedById { get; set; } = string.Empty;

    public Position Position { get; set; } = null!;

    public AttributeEntity Attribute { get; set; } = null!;

    public ApplicationUser CreatedBy { get; set; } = null!;
}
