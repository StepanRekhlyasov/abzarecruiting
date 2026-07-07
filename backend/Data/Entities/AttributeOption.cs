namespace Backend.Api.Data.Entities;

public class AttributeOption
{
    public int Id { get; set; }

    public int AttributeId { get; set; }
    public Attribute Attribute { get; set; } = null!;

    public string InputOption { get; set; } = string.Empty;
}

