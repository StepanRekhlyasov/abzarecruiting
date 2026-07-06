using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models.Tag;

public class CreateTagRequest
{
    [Required]
    [MaxLength(256)]
    public string Name { get; set; } = string.Empty;
}

public class TagDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}
