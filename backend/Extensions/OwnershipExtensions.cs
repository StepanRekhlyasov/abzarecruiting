using System.Security.Claims;

namespace Backend.Api.Extensions;

public static class OwnershipExtensions
{
    public static bool CanModifyOwner(string? ownerId, string? userId, bool isAdmin) =>
        isAdmin || (!string.IsNullOrEmpty(userId) && ownerId == userId);

    public static bool CanAccessOwner(
        string? ownerId,
        string? userId,
        bool isAdmin,
        bool allowRecruiter) =>
        isAdmin || allowRecruiter || (!string.IsNullOrEmpty(userId) && ownerId == userId);

    public static bool IsSelfOrAdmin(this ClaimsPrincipal? user, string candidateId) =>
        user.IsAdmin() || user.GetUserId() == candidateId;
}
