using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models.Attribute;

public class CreateAttributeRequest
{
    [Required]
    [MaxLength(256)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string? Description { get; set; }

    [Required]
    [MaxLength(64)]
    public string ValueType { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string InputType { get; set; } = string.Empty;
}

public class UpdateAttributeRequest : CreateAttributeRequest;

public class AttributeDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string ValueType { get; set; } = string.Empty;

    public string InputType { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}

public class SetProfileAttributeRequest
{
    [Required]
    public string Value { get; set; } = string.Empty;
}

public class DeleteAttributesRequest
{
    [Required]
    [MinLength(1)]
    public IList<int> Ids { get; set; } = [];
}
