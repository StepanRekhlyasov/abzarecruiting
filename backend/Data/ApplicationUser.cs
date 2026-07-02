using Backend.Api.Data.Entities;
using Backend.Api.Data.Enums;
using Backend.Api.Data.Relations;
using Microsoft.AspNetCore.Identity;

namespace Backend.Api.Data;

public class ApplicationUser : IdentityUser
{
    public string? DisplayName { get; set; }

    public DateTime CreatedAt { get; set; }

    public UserRole Role { get; set; }

    public ICollection<ProfileAttribute> ProfileAttributes { get; set; } = [];

    public ICollection<Resume> Resumes { get; set; } = [];

    public ICollection<Project> Projects { get; set; } = [];
}
