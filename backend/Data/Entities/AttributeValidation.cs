using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Data.Entities;

public class AttributeValidation
{
    public int Id { get; set; }

    public int AttributeId { get; set; }

    public string ValidationType { get; set; } = string.Empty;

    public string ValidationValue { get; set; } = string.Empty;

    public AttributeEntity Attribute { get; set; } = null!;
}
