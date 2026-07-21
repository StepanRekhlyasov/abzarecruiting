using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models.User;

public class UserListItemDto
{
    public string Id { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public bool EmailConfirmed { get; set; }

    public bool IsLockedOut { get; set; }

    public DateTime CreatedAt { get; set; }
}

public class UserRewardsDto
{
    public string Role { get; set; } = string.Empty;

    public int PublishedResumesCount { get; set; }

    public int MaxPublishedResumeLikes { get; set; }

    public int LikesGivenCount { get; set; }
}

public class CreateUserRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = string.Empty;
}

public class ChangeUsersRoleBatchRequest
{
    [Required]
    [MinLength(1)]
    public List<string> UserIds { get; set; } = [];

    [Required]
    public string Role { get; set; } = string.Empty;
}

public class DeleteUsersRequest
{
    [Required]
    [MinLength(1)]
    public List<string> UserIds { get; set; } = [];
}

public class SetUserLockoutRequest
{
    [Required]
    public bool Locked { get; set; }
}

public class SetUserActivationRequest
{
    [Required]
    public bool Activated { get; set; }
}

public class SendActivationEmailRequest
{
    [Required]
    [Url]
    public string FrontendBaseUrl { get; set; } = string.Empty;
}
