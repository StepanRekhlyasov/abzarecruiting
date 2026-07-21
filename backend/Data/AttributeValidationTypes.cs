namespace Backend.Api.Data;

public static class AttributeValidationTypes
{
    public const string MaxLength = "maxLength";
    public const string MinLength = "minLength";
    public const string MaxNumber = "maxNumber";
    public const string MinNumber = "minNumber";
    public const string Regex = "regex";
    public const string MaxFileSizeKb = "maxFileSizeKb";

    public static readonly IReadOnlySet<string> StringTypes =
        new HashSet<string>(StringComparer.Ordinal)
        {
            MaxLength,
            MinLength,
            Regex,
        };

    public static readonly IReadOnlySet<string> NumberTypes =
        new HashSet<string>(StringComparer.Ordinal)
        {
            MaxNumber,
            MinNumber,
        };

    public static readonly IReadOnlySet<string> FileTypes =
        new HashSet<string>(StringComparer.Ordinal)
        {
            MaxFileSizeKb,
        };

    public static readonly IReadOnlySet<string> All =
        new HashSet<string>(StringComparer.Ordinal)
        {
            MaxLength,
            MinLength,
            MaxNumber,
            MinNumber,
            Regex,
            MaxFileSizeKb,
        };

    public static bool IsValid(string validationType) => All.Contains(validationType);

    public static bool IsAllowedForValueType(string validationType, string valueType)
    {
        var normalizedValueType = valueType.ToLowerInvariant();

        if (StringTypes.Contains(validationType))
        {
            return normalizedValueType is "string" or "text" or "select";
        }

        if (NumberTypes.Contains(validationType))
        {
            return normalizedValueType == "number";
        }

        if (FileTypes.Contains(validationType))
        {
            return normalizedValueType is "image" or "file";
        }

        return false;
    }

    public static IReadOnlyList<string> GetAllowedForValueType(string valueType)
    {
        var normalizedValueType = valueType.ToLowerInvariant();

        return normalizedValueType switch
        {
            "string" or "text" or "select" => [MaxLength, MinLength, Regex],
            "number" => [MaxNumber, MinNumber],
            "image" or "file" => [MaxFileSizeKb],
            _ => [],
        };
    }
}
