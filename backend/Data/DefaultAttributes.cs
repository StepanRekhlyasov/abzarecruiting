namespace Backend.Api.Data;

public static class DefaultAttributes
{
    public const string FirstName = "First name";
    public const string LastName = "Last name";
    public const string Email = "Email";
    public const string Phone = "Phone number";
    public const string Bio = "Biography";
    public const string Location = "Location";
    public const string Photo = "Profile photo";

    public static readonly string[] Names =
    [
        FirstName,
        LastName,
        Email,
        Phone,
        Bio,
        Location,
        Photo,
    ];

    public static readonly DefaultAttributeDefinition[] All =
    [
        new(Photo, "image", "image", null),
        new(FirstName, "string", "text", null),
        new(LastName, "string", "text", null),
        new(Email, "string", "email", null),
        new(Phone, "string", "tel", null),
        new(Bio, "text", "textarea", null),
        new(Location, "string", "text", null),
    ];

    private static readonly Dictionary<string, string> LegacyNames = new(StringComparer.Ordinal)
    {
        ["firstName"] = FirstName,
        ["lastName"] = LastName,
        ["email"] = Email,
        ["phone"] = Phone,
        ["bio"] = Bio,
        ["location"] = Location,
        ["photo"] = Photo,
    };

    public static IReadOnlyDictionary<string, string> LegacyNameMap => LegacyNames;

    public static bool IsDefaultName(string name) =>
        Names.Contains(name);
}

public record DefaultAttributeDefinition(
    string Name,
    string ValueType,
    string InputType,
    string? Description);
