namespace Backend.Api.Configuration;

public class AuthenticationSettings
{
    public const string SectionName = "Authentication";

    public GoogleAuthSettings Google { get; set; } = new();

    public FacebookAuthSettings Facebook { get; set; } = new();
}

public class GoogleAuthSettings
{
    public string ClientId { get; set; } = string.Empty;

    public string ClientSecret { get; set; } = string.Empty;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ClientSecret);
}

public class FacebookAuthSettings
{
    public string AppId { get; set; } = string.Empty;

    public string AppSecret { get; set; } = string.Empty;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(AppId) && !string.IsNullOrWhiteSpace(AppSecret);
}
