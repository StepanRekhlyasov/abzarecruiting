using Backend.Api.Data.Entities;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Data.Relations;

public class PositionAttribute
{
    public int PositionId { get; set; }

    public int AttributeId { get; set; }

    public bool IsKey { get; set; }

    public Position Position { get; set; } = null!;

    public AttributeEntity Attribute { get; set; } = null!;
}
