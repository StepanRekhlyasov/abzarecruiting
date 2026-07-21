using Backend.Api.Data;

namespace Backend.Api.Data.Seeders.MockData;

internal static class MockAttributeValidationDefinitions
{
    internal sealed record Definition(string AttributeName, string ValidationType, string ValidationValue);

    /// <summary>Validation rules for ~15 mock attributes (multiple rules allowed per attribute).</summary>
    public static IReadOnlyList<Definition> All { get; } =
    [
        new("GitHub username", AttributeValidationTypes.MinLength, "2"),
        new("GitHub username", AttributeValidationTypes.MaxLength, "39"),
        new("GitHub username", AttributeValidationTypes.Regex, @"^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$"),

        new("LinkedIn profile URL", AttributeValidationTypes.MinLength, "12"),
        new("LinkedIn profile URL", AttributeValidationTypes.Regex, @"^https?://.+"),

        new("Preferred first name", AttributeValidationTypes.MinLength, "1"),
        new("Preferred first name", AttributeValidationTypes.MaxLength, "64"),

        new("Primary programming language", AttributeValidationTypes.MaxLength, "64"),

        new("Professional summary", AttributeValidationTypes.MinLength, "20"),
        new("Professional summary", AttributeValidationTypes.MaxLength, "2000"),

        new("Career goals", AttributeValidationTypes.MaxLength, "1000"),

        new("Years of professional experience", AttributeValidationTypes.MinNumber, "0"),
        new("Years of professional experience", AttributeValidationTypes.MaxNumber, "50"),

        new("Years of backend experience", AttributeValidationTypes.MinNumber, "0"),
        new("Years of backend experience", AttributeValidationTypes.MaxNumber, "40"),

        new("Years of frontend experience", AttributeValidationTypes.MinNumber, "0"),
        new("Years of frontend experience", AttributeValidationTypes.MaxNumber, "40"),

        new("Team size led", AttributeValidationTypes.MinNumber, "0"),
        new("Team size led", AttributeValidationTypes.MaxNumber, "200"),

        new("IELTS overall score", AttributeValidationTypes.MinNumber, "0"),
        new("IELTS overall score", AttributeValidationTypes.MaxNumber, "9"),

        new("SQL query complexity rating", AttributeValidationTypes.MinNumber, "1"),
        new("SQL query complexity rating", AttributeValidationTypes.MaxNumber, "10"),

        new("English proficiency level", AttributeValidationTypes.Regex, "^(A1|A2|B1|B2|C1|C2)$"),

        new("C# proficiency", AttributeValidationTypes.Regex, "^(Beginner|Intermediate|Advanced|Expert)$"),

        new("CV document", AttributeValidationTypes.MaxFileSizeKb, "5120"),
        new("Passport photo scan", AttributeValidationTypes.MaxFileSizeKb, "2048"),
        new("Code sample archive", AttributeValidationTypes.MaxFileSizeKb, "10240"),
    ];
}
