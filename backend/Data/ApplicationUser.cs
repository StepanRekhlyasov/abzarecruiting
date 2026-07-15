using Backend.Api.Data.Entities;
using Backend.Api.Data.Relations;
using Microsoft.AspNetCore.Identity;

namespace Backend.Api.Data;

public class ApplicationUser : IdentityUser
{
    public DateTime CreatedAt { get; set; }

    public ICollection<ProfileAttribute> ProfileAttributes { get; set; } = [];

    public ICollection<Resume> Resumes { get; set; } = [];

    public ICollection<ProfileProject> ProfileProjects { get; set; } = [];

    public ICollection<LikesResume> ResumeLikes { get; set; } = [];

    public ICollection<PositionMessage> PositionMessages { get; set; } = [];
}
