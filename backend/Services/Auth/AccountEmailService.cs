using System.Net;
using Backend.Api.Data;
using Backend.Api.Services.Email;
using Microsoft.AspNetCore.Identity;

namespace Backend.Api.Services.Auth;

public interface IAccountEmailService
{
    Task SendActivationEmailAsync(
        ApplicationUser user,
        string frontendBaseUrl,
        CancellationToken cancellationToken = default);
}

public class AccountEmailService(
    UserManager<ApplicationUser> userManager,
    IEmailSender emailSender) : IAccountEmailService
{
    public async Task SendActivationEmailAsync(
        ApplicationUser user,
        string frontendBaseUrl,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
        {
            throw new InvalidOperationException("error.users.emailMissing");
        }

        var baseUrl = NormalizeFrontendBaseUrl(frontendBaseUrl);
        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var confirmUrl =
            $"{baseUrl}/confirm-email?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(token)}";

        var subject = "Account activation";
        var body =
            $"<p>Confirm your account by opening this link:</p><p><a href=\"{WebUtility.HtmlEncode(confirmUrl)}\">{WebUtility.HtmlEncode(confirmUrl)}</a></p>";

        await emailSender.SendAsync(user.Email, subject, body, cancellationToken);
    }

    private static string NormalizeFrontendBaseUrl(string frontendBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(frontendBaseUrl))
        {
            throw new InvalidOperationException("error.auth.frontendBaseUrlRequired");
        }

        var trimmed = frontendBaseUrl.Trim().TrimEnd('/');
        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException("error.auth.invalidFrontendBaseUrl");
        }

        return $"{uri.Scheme}://{uri.Authority}";
    }
}
