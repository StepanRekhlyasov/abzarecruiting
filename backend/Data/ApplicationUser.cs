using Microsoft.AspNetCore.Identity;

namespace Backend.Api.Data;

public class ApplicationUser : IdentityUser
{
    public string? DisplayName { get; set; }
}
