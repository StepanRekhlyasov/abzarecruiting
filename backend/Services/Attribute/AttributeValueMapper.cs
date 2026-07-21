using System.Globalization;
using Backend.Api.Data.Relations;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Services.Attribute;

public interface IAttributeValueMapper
{
    void SetValue(ProfileAttribute profileAttribute, AttributeEntity attribute, string? value);

    string? GetComparableValue(ProfileAttribute? profileAttribute, AttributeEntity attribute);

    bool HasValue(ProfileAttribute? profileAttribute, AttributeEntity attribute);
}

public class AttributeValueMapper : IAttributeValueMapper
{
    public void SetValue(ProfileAttribute profileAttribute, AttributeEntity attribute, string? value)
    {
        profileAttribute.ValueString = null;
        profileAttribute.ValueText = null;
        profileAttribute.ValueNumber = null;
        profileAttribute.ValueBoolean = null;
        profileAttribute.ValueDate = null;
        profileAttribute.ValueDateFrom = null;
        profileAttribute.ValueDateTo = null;

        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        switch (attribute.ValueType.ToLowerInvariant())
        {
            case "text":
                profileAttribute.ValueText = value;
                break;
            case "number":
                if (!TryParseNumber(value, out var number))
                {
                    throw new InvalidOperationException("error.attributes.unsupportedValueType");
                }

                profileAttribute.ValueNumber = NormalizeDecimal(number);
                break;
            case "boolean":
                profileAttribute.ValueBoolean = bool.Parse(value);
                break;
            case "date":
                profileAttribute.ValueDate = DateTime.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
                break;
            case "image":
            case "file":
                if (!Guid.TryParse(value, out var fileUid))
                {
                    throw new InvalidOperationException("error.files.invalidUid");
                }

                profileAttribute.ValueString = fileUid.ToString();
                break;
            default:
                profileAttribute.ValueString = value;
                break;
        }
    }

    public string? GetComparableValue(ProfileAttribute? profileAttribute, AttributeEntity attribute)
    {
        if (profileAttribute is null)
        {
            return null;
        }

        return attribute.ValueType.ToLowerInvariant() switch
        {
            "text" => profileAttribute.ValueText,
            "number" => profileAttribute.ValueNumber is null
                ? null
                : FormatNumber(profileAttribute.ValueNumber.Value),
            "boolean" => profileAttribute.ValueBoolean switch
            {
                true => "true",
                false => "false",
                null => null,
            },
            "date" => profileAttribute.ValueDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            _ => profileAttribute.ValueString,
        };
    }

    public bool HasValue(ProfileAttribute? profileAttribute, AttributeEntity attribute)
    {
        var value = GetComparableValue(profileAttribute, attribute);
        return !string.IsNullOrWhiteSpace(value);
    }

    private static bool TryParseNumber(string value, out decimal number)
    {
        if (decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out number)
            || decimal.TryParse(value, NumberStyles.Number, CultureInfo.CurrentCulture, out number))
        {
            return true;
        }

        return false;
    }

    private static string FormatNumber(decimal number) =>
        number.ToString("G29", CultureInfo.InvariantCulture);

    private static decimal NormalizeDecimal(decimal number) =>
        decimal.Parse(FormatNumber(number), NumberStyles.Number, CultureInfo.InvariantCulture);
}
