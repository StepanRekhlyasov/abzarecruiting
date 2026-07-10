using Backend.Api.Data;
using Backend.Api.Data.Entities;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Data.Relations;

public class ProfileAttribute
{
    public string CandidateId { get; set; } = string.Empty;

    public int AttributeId { get; set; }

    public string? ValueString { get; set; }

    public decimal? ValueNumber { get; set; }

    public bool? ValueBoolean { get; set; }

    public string? ValueText { get; set; }

    public DateTime? ValueDate { get; set; }

    public DateTime? ValueDateFrom { get; set; }

    public DateTime? ValueDateTo { get; set; }

    public int Version { get; set; }

    public ApplicationUser Candidate { get; set; } = null!;

    public AttributeEntity Attribute { get; set; } = null!;
}
