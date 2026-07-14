using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Auth;
using Backend.Api.Services.Auth;
using Backend.Api.Services.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IJwtTokenService jwtTokenService,
    IProfileAttributeService profileAttributeService,
    IAccountEmailService accountEmailService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<RegisterResultResponse>> Register([FromBody] RegisterRequest request)
    {
        if (request.Role is not (Roles.Candidate or Roles.Recruiter))
        {
            return BadRequest(new { message = "error.auth.invalidRole" });
        }

        if (string.IsNullOrWhiteSpace(request.FrontendBaseUrl)
            || !Uri.TryCreate(request.FrontendBaseUrl.Trim(), UriKind.Absolute, out var frontendUri)
            || (frontendUri.Scheme != Uri.UriSchemeHttp && frontendUri.Scheme != Uri.UriSchemeHttps))
        {
            return BadRequest(new { message = "error.auth.invalidFrontendBaseUrl" });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow,
            EmailConfirmed = false,
        };

        var result = await userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(error => error.Description) });
        }

        await userManager.AddToRoleAsync(user, request.Role);

        try
        {
            await profileAttributeService.SetStringValuesAsync(user.Id, new Dictionary<string, string>
            {
                [DefaultAttributes.FirstName] = request.FirstName,
                [DefaultAttributes.LastName] = request.LastName,
                [DefaultAttributes.Email] = request.Email,
            });
            await accountEmailService.SendActivationEmailAsync(user, request.FrontendBaseUrl);
        }
        catch (InvalidOperationException exception)
        {
            await userManager.DeleteAsync(user);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = exception.Message });
        }

        return Ok(new RegisterResultResponse
        {
            Message = "auth.register.checkEmail",
        });
    }

    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest(new { message = "error.auth.invalidConfirmation" });
        }

        var user = await userManager.FindByIdAsync(request.UserId);
        if (user is null)
        {
            return BadRequest(new { message = "error.auth.invalidConfirmation" });
        }

        if (user.EmailConfirmed)
        {
            return Ok(new { message = "auth.confirmEmail.success" });
        }

        var result = await userManager.ConfirmEmailAsync(user, request.Token);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "error.auth.invalidConfirmation" });
        }

        return Ok(new { message = "auth.confirmEmail.success" });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        if (user is null)
        {
            return Unauthorized(new { message = "error.auth.invalidCredentials" });
        }

        if (await userManager.IsLockedOutAsync(user))
        {
            return Unauthorized(new { message = "error.auth.userLockedOut" });
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
        {
            return Unauthorized(new { message = "error.auth.userLockedOut" });
        }

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "error.auth.invalidCredentials" });
        }

        var token = await jwtTokenService.CreateTokenAsync(user);
        var roles = await userManager.GetRolesAsync(user);
        var profileValues = await profileAttributeService.GetStringValuesAsync(
            user.Id,
            DefaultAttributes.FirstName,
            DefaultAttributes.LastName);

        return Ok(new AuthResponse
        {
            AccessToken = token.AccessToken,
            ExpiresAt = token.ExpiresAt,
            Email = user.Email ?? string.Empty,
            FirstName = profileValues.GetValueOrDefault(DefaultAttributes.FirstName) ?? string.Empty,
            LastName = profileValues.GetValueOrDefault(DefaultAttributes.LastName) ?? string.Empty,
            Roles = roles,
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> GetCurrentUser()
    {
        var userId = User.GetUserId();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var user = await userManager.FindByIdAsync(userId);

        if (user is null)
        {
            return Unauthorized();
        }

        var roles = await userManager.GetRolesAsync(user);
        var profileValues = await profileAttributeService.GetStringValuesAsync(
            user.Id,
            DefaultAttributes.FirstName,
            DefaultAttributes.LastName);

        return Ok(new CurrentUserResponse
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = profileValues.GetValueOrDefault(DefaultAttributes.FirstName) ?? string.Empty,
            LastName = profileValues.GetValueOrDefault(DefaultAttributes.LastName) ?? string.Empty,
            Roles = roles,
        });
    }
}
