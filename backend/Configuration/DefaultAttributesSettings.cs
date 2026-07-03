namespace Backend.Api.Configuration;

public class DefaultAttributesSettings
{
    public const string SectionName = "DefaultAttributes";

    public string? SystemUserId { get; set; }

    public string? SystemUserEmail { get; set; }

    public string? SystemUserPassword { get; set; }
}
