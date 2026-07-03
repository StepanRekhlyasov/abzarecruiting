using Backend.Api.Data.Entities;
using Backend.Api.Data.Relations;
using Microsoft.AspNetCore.Identity;

namespace Backend.Api.Data;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public ICollection<ProfileAttribute> ProfileAttributes { get; set; } = [];

    public ICollection<Resume> Resumes { get; set; } = [];

    public ICollection<Project> Projects { get; set; } = [];
}
