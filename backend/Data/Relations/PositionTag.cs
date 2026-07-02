using Backend.Api.Data.Entities;

namespace Backend.Api.Data.Relations;

public class PositionTag
{
    public int PositionId { get; set; }

    public int TagId { get; set; }

    public Position Position { get; set; } = null!;

    public Tag Tag { get; set; } = null!;
}
