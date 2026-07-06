using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Backend.Api.Data;

namespace Backend.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static string? GetUserId(this ClaimsPrincipal? user) =>
        user?.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? user?.FindFirstValue(ClaimTypes.NameIdentifier);

    public static bool IsInRole(this ClaimsPrincipal? user, string role) =>
        user?.IsInRole(role) ?? false;

    public static bool IsAdmin(this ClaimsPrincipal? user) =>
        user?.IsInRole(Roles.Admin) == true;

    public static bool IsRecruiter(this ClaimsPrincipal? user) =>
        user?.IsInRole(Roles.Recruiter) == true;

    public static bool IsCandidate(this ClaimsPrincipal? user) =>
        user?.IsInRole(Roles.Candidate) == true;

    public static bool IsRecruiterOrAdmin(this ClaimsPrincipal? user) =>
        user.IsAdmin() || user.IsRecruiter();
}
