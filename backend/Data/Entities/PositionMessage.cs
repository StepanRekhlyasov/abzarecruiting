namespace Backend.Api.Data.Entities;

public class PositionMessage
{
    public int Id { get; set; }

    public int PositionId { get; set; }

    public Position Position { get; set; } = null!;

    public string Content { get; set; } = string.Empty;

    public string? CreatedById { get; set; }

    public ApplicationUser? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }
}
