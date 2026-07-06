using Backend.Api.Data.Relations;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Services.Attributes;

public interface IAttributeValueMapper
{
    void SetValue(ProfileAttribute profileAttribute, AttributeEntity attribute, string value);

    string? GetComparableValue(ProfileAttribute? profileAttribute, AttributeEntity attribute);

    bool HasValue(ProfileAttribute? profileAttribute, AttributeEntity attribute);
}

public class AttributeValueMapper : IAttributeValueMapper
{
    public void SetValue(ProfileAttribute profileAttribute, AttributeEntity attribute, string value)
    {
        profileAttribute.ValueString = null;
        profileAttribute.ValueText = null;
        profileAttribute.ValueNumber = null;
        profileAttribute.ValueBoolean = null;
        profileAttribute.ValueDate = null;
        profileAttribute.ValueDateFrom = null;
        profileAttribute.ValueDateTo = null;

        switch (attribute.ValueType.ToLowerInvariant())
        {
            case "text":
                profileAttribute.ValueText = value;
                break;
            case "number":
                profileAttribute.ValueNumber = decimal.Parse(value);
                break;
            case "boolean":
                profileAttribute.ValueBoolean = bool.Parse(value);
                break;
            case "date":
                profileAttribute.ValueDate = DateTime.Parse(value);
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
            "number" => profileAttribute.ValueNumber?.ToString(),
            "boolean" => profileAttribute.ValueBoolean?.ToString(),
            "date" => profileAttribute.ValueDate?.ToString("O"),
            _ => profileAttribute.ValueString,
        };
    }

    public bool HasValue(ProfileAttribute? profileAttribute, AttributeEntity attribute)
    {
        var value = GetComparableValue(profileAttribute, attribute);
        return !string.IsNullOrWhiteSpace(value);
    }
}
