using Backend.Api.Data;
using Backend.Api.Models.Auth;
using Backend.Api.Services.Auth;
using Backend.Api.Services.Profile;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IJwtTokenService jwtTokenService,
    IProfileAttributeService profileAttributeService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow,
        };

        var result = await userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(error => error.Description) });
        }

        await userManager.AddToRoleAsync(user, Roles.Candidate);

        try
        {
            await profileAttributeService.SetStringValuesAsync(user.Id, new Dictionary<string, string>
            {
                [DefaultAttributes.FirstName] = request.FirstName,
                [DefaultAttributes.LastName] = request.LastName,
            });
        }
        catch (InvalidOperationException exception)
        {
            await userManager.DeleteAsync(user);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = exception.Message });
        }

        var token = await jwtTokenService.CreateTokenAsync(user);
        var roles = await userManager.GetRolesAsync(user);

        return Ok(new AuthResponse
        {
            AccessToken = token.AccessToken,
            ExpiresAt = token.ExpiresAt,
            Email = user.Email ?? string.Empty,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Roles = roles,
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid email or password." });
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
}
