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

public class SyncRestrictionItem
{
    public int? Id { get; set; }

    public int? Version { get; set; }

    public int? AttributeId { get; set; }

    public int? TagId { get; set; }

    public string? TargetValue { get; set; }

    [Required]
    public RestrictionCondition Condition { get; set; }
}

public class SyncRestrictionsRequest
{
    [Required]
    public int PositionId { get; set; }

    public IList<SyncRestrictionItem> Items { get; set; } = [];
}

public class RestrictionDto
{
    public int Id { get; set; }

    public int PositionId { get; set; }

    public int? AttributeId { get; set; }

    public string? AttributeName { get; set; }

    public string? AttributeValueType { get; set; }

    public int? TagId { get; set; }

    public string? TagName { get; set; }

    public string? TargetValue { get; set; }

    public RestrictionCondition Condition { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? CreatedById { get; set; }

    public int Version { get; set; }
}
