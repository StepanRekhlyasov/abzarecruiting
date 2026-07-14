using System.Net;
using System.Net.Mail;
using Backend.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Backend.Api.Services.Email;

public class SmtpEmailSender(
    IOptions<SmtpSettings> smtpOptions,
    ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(
        string toEmail,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken = default)
    {
        var settings = smtpOptions.Value;
        if (string.IsNullOrWhiteSpace(settings.Host)
            || string.IsNullOrWhiteSpace(settings.User)
            || string.IsNullOrWhiteSpace(settings.Password)
            || string.IsNullOrWhiteSpace(settings.From))
        {
            throw new InvalidOperationException("error.email.smtpNotConfigured");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(settings.From),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(settings.Host, settings.Port)
        {
            EnableSsl = true,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(
                settings.User,
                settings.Password.Replace(" ", string.Empty, StringComparison.Ordinal)),
        };

        try
        {
            await client.SendMailAsync(message, cancellationToken);
            logger.LogInformation("Email sent to {ToEmail}. Subject: {Subject}", toEmail, subject);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to send email to {ToEmail}", toEmail);
            throw new InvalidOperationException("error.email.sendFailed", exception);
        }
    }
}
