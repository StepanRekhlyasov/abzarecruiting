using Backend.Api.Data.Entities;

namespace Backend.Api.Data.Relations;

public class ProfileProjectTag
{
    public int ProfileProjectId { get; set; }

    public int TagId { get; set; }

    public ProfileProject ProfileProject { get; set; } = null!;

    public Tag Tag { get; set; } = null!;
}
