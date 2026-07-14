using Backend.Api.Data.Entities;

namespace Backend.Api.Data.Relations;

public class LikesResume
{
    public string UserId { get; set; } = string.Empty;

    public int ResumeId { get; set; }

    public DateTime CreatedAt { get; set; }

    public ApplicationUser User { get; set; } = null!;

    public Resume Resume { get; set; } = null!;
}
