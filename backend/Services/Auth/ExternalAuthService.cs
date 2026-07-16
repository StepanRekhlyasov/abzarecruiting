using System.Security.Claims;
using Backend.Api.Data;
using Backend.Api.Models.Auth;
using Backend.Api.Services.Profile;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace Backend.Api.Services.Auth;

public interface IExternalAuthService
{
    bool IsProviderSupported(string provider);

    string? ResolveAuthenticationScheme(string provider);

    bool TryValidateReturnUrl(string? returnUrl, out Uri returnUri);

    Task<ExternalAuthResult> CompleteExternalLoginAsync(ExternalLoginInfo loginInfo);
}

public record ExternalAuthResult(bool Succeeded, AuthResponse? Response, string? ErrorCode);

public class ExternalAuthService(
    UserManager<ApplicationUser> userManager,
    IJwtTokenService jwtTokenService,
    IProfileAttributeService profileAttributeService,
    IOptions<Configuration.AppSettings> appSettings,
    IConfiguration configuration) : IExternalAuthService
{
    private static readonly HashSet<string> SupportedSchemes = new(StringComparer.OrdinalIgnoreCase)
    {
        GoogleDefaults.AuthenticationScheme,
        FacebookDefaults.AuthenticationScheme,
    };

    public bool IsProviderSupported(string provider) =>
        ResolveAuthenticationScheme(provider) is not null;

    public string? ResolveAuthenticationScheme(string provider)
    {
        if (string.IsNullOrWhiteSpace(provider))
        {
            return null;
        }

        if (provider.Equals("google", StringComparison.OrdinalIgnoreCase)
            || provider.Equals(GoogleDefaults.AuthenticationScheme, StringComparison.OrdinalIgnoreCase))
        {
            return GoogleDefaults.AuthenticationScheme;
        }

        if (provider.Equals("facebook", StringComparison.OrdinalIgnoreCase)
            || provider.Equals(FacebookDefaults.AuthenticationScheme, StringComparison.OrdinalIgnoreCase))
        {
            return FacebookDefaults.AuthenticationScheme;
        }

        return null;
    }

    public bool TryValidateReturnUrl(string? returnUrl, out Uri returnUri)
    {
        returnUri = null!;

        if (string.IsNullOrWhiteSpace(returnUrl)
            || !Uri.TryCreate(returnUrl.Trim(), UriKind.Absolute, out var parsed)
            || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
        {
            return false;
        }

        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        var frontendBaseUrl = appSettings.Value.FrontendBaseUrl?.TrimEnd('/');
        var candidates = allowedOrigins
            .Append(frontendBaseUrl)
            .Where(origin => !string.IsNullOrWhiteSpace(origin))
            .Select(origin => origin!.TrimEnd('/'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var origin = $"{parsed.Scheme}://{parsed.Authority}";
        if (!candidates.Any(allowed => string.Equals(allowed, origin, StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }

        returnUri = parsed;
        return true;
    }

    public async Task<ExternalAuthResult> CompleteExternalLoginAsync(ExternalLoginInfo loginInfo)
    {
        if (!SupportedSchemes.Contains(loginInfo.LoginProvider))
        {
            return new ExternalAuthResult(false, null, "error.auth.externalLoginFailed");
        }

        var user = await userManager.FindByLoginAsync(loginInfo.LoginProvider, loginInfo.ProviderKey);

        if (user is null)
        {
            var email = loginInfo.Principal.FindFirstValue(ClaimTypes.Email)
                ?? loginInfo.Principal.FindFirstValue("email");

            if (string.IsNullOrWhiteSpace(email))
            {
                return new ExternalAuthResult(false, null, "error.auth.externalLoginEmailRequired");
            }

            user = await userManager.FindByEmailAsync(email);

            if (user is null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow,
                };

                var createResult = await userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    return new ExternalAuthResult(false, null, "error.auth.externalLoginFailed");
                }

                await userManager.AddToRoleAsync(user, Roles.Candidate);

                var (firstName, lastName) = ExtractNames(loginInfo.Principal);
                try
                {
                    await profileAttributeService.SetStringValuesAsync(user.Id, new Dictionary<string, string>
                    {
                        [DefaultAttributes.FirstName] = firstName,
                        [DefaultAttributes.LastName] = lastName,
                        [DefaultAttributes.Email] = email,
                    });
                }
                catch (InvalidOperationException)
                {
                    // Default profile attributes may be missing after data wipe; login must still succeed.
                }
            }

            var addLoginResult = await userManager.AddLoginAsync(user, loginInfo);
            if (!addLoginResult.Succeeded)
            {
                return new ExternalAuthResult(false, null, "error.auth.externalLoginFailed");
            }

            if (!user.EmailConfirmed)
            {
                user.EmailConfirmed = true;
                await userManager.UpdateAsync(user);
            }
        }

        if (await userManager.IsLockedOutAsync(user))
        {
            return new ExternalAuthResult(false, null, "error.auth.userLockedOut");
        }

        var token = await jwtTokenService.CreateTokenAsync(user);
        var roles = await userManager.GetRolesAsync(user);
        var profileValues = await profileAttributeService.GetStringValuesAsync(
            user.Id,
            DefaultAttributes.FirstName,
            DefaultAttributes.LastName);

        return new ExternalAuthResult(
            true,
            new AuthResponse
            {
                AccessToken = token.AccessToken,
                ExpiresAt = token.ExpiresAt,
                Email = user.Email ?? string.Empty,
                FirstName = profileValues.GetValueOrDefault(DefaultAttributes.FirstName) ?? string.Empty,
                LastName = profileValues.GetValueOrDefault(DefaultAttributes.LastName) ?? string.Empty,
                Roles = roles,
            },
            null);
    }

    private static (string FirstName, string LastName) ExtractNames(ClaimsPrincipal principal)
    {
        var givenName = principal.FindFirstValue(ClaimTypes.GivenName)
            ?? principal.FindFirstValue("given_name");
        var surname = principal.FindFirstValue(ClaimTypes.Surname)
            ?? principal.FindFirstValue("family_name");

        if (!string.IsNullOrWhiteSpace(givenName) || !string.IsNullOrWhiteSpace(surname))
        {
            return (givenName ?? string.Empty, surname ?? string.Empty);
        }

        var fullName = principal.FindFirstValue(ClaimTypes.Name)
            ?? principal.FindFirstValue("name")
            ?? string.Empty;

        if (string.IsNullOrWhiteSpace(fullName))
        {
            return (string.Empty, string.Empty);
        }

        var parts = fullName.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch
        {
            1 => (parts[0], string.Empty),
            _ => (parts[0], parts[1]),
        };
    }
}
