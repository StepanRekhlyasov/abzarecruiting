using System.ComponentModel.DataAnnotations;
using Backend.Api.Data.Enums;

namespace Backend.Api.Models.Restriction;

public class CreateRestrictionRequest
{
    [Required]
    public int PositionId { get; set; }

    public int? AttributeId { get; set; }

    public int? TagId { get; set; }

    public string? TargetValue { get; set; }

    [Required]
    public RestrictionCondition Condition { get; set; }
}

public class UpdateRestrictionRequest : CreateRestrictionRequest
{
    public int Version { get; set; }
}

public class RestrictionDto
{
    public int Id { get; set; }

    public int PositionId { get; set; }

    public int? AttributeId { get; set; }

    public int? TagId { get; set; }

    public string? TargetValue { get; set; }

    public RestrictionCondition Condition { get; set; }

    public DateTime CreatedAt { get; set; }

    public string CreatedById { get; set; } = string.Empty;

    public int Version { get; set; }
}
