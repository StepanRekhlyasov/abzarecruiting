using Backend.Api.Data.Relations;

namespace Backend.Api.Data.Entities;

public class Resume
{
    public int Id { get; set; }
    public string CandidateId { get; set; } = string.Empty;
    public int PositionId { get; set; }
    public bool Published { get; set; }
    public DateTime CreatedAt { get; set; }
    public int Version { get; set; }
    public ApplicationUser Candidate { get; set; } = null!;
    public Position Position { get; set; } = null!;
    public ICollection<LikesResume> Likes { get; set; } = [];
}
