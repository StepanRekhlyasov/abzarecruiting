namespace Backend.Api.Data;

public static class DefaultAttributes
{
    public const string FirstName = "firstName";
    public const string LastName = "lastName";
    public const string Phone = "phone";
    public const string Bio = "bio";
    public const string Location = "location";
    public const string Photo = "photo";

    public static readonly DefaultAttributeDefinition[] All =
    [
        new(FirstName, "string", "text", "First name"),
        new(LastName, "string", "text", "Last name"),
        new(Phone, "string", "tel", "Phone number"),
        new(Bio, "text", "textarea", "Biography"),
        new(Location, "string", "text", "Location"),
        new(Photo, "string", "image", "Profile photo"),
    ];
}

public record DefaultAttributeDefinition(
    string Name,
    string ValueType,
    string InputType,
    string Description);
