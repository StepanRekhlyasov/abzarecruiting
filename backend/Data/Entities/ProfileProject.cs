using Backend.Api.Data.Relations;

namespace Backend.Api.Data.Entities;

public class ProfileProject
{
    public int Id { get; set; }

    public string CandidateId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public DateTime StartAt { get; set; }

    public DateTime? EndAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public ApplicationUser Candidate { get; set; } = null!;

    public ICollection<ProfileProjectTag> ProfileProjectTags { get; set; } = [];
}
