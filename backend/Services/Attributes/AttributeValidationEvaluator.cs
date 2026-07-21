using System.Globalization;
using System.Text.RegularExpressions;
using Backend.Api.Data;
using Backend.Api.Data.Entities;
using Backend.Api.Services.Files;
using Microsoft.EntityFrameworkCore;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;

namespace Backend.Api.Services.Attributes;

public class AttributeValidationFieldError
{
    public required string Message { get; init; }

    public IReadOnlyDictionary<string, string> Params { get; init; } =
        new Dictionary<string, string>();
}

public class AttributeValueValidationException : InvalidOperationException
{
    public AttributeValueValidationException(IReadOnlyDictionary<int, AttributeValidationFieldError> fieldErrors)
        : base("error.attributes.validationFailed")
    {
        FieldErrors = fieldErrors;
    }

    public IReadOnlyDictionary<int, AttributeValidationFieldError> FieldErrors { get; }
}

public interface IAttributeValidationEvaluator
{
    void ValidateDefinitionRules(string valueType, IEnumerable<AttributeValidation> validations);

    Task ValidateValueAsync(
        AttributeEntity attribute,
        string? value,
        IReadOnlyList<AttributeValidation> validations,
        CancellationToken cancellationToken = default);

    Task ValidateBatchAsync(
        IReadOnlyDictionary<int, AttributeEntity> attributesById,
        IReadOnlyDictionary<int, IReadOnlyList<AttributeValidation>> validationsByAttributeId,
        IEnumerable<(int AttributeId, string? Value)> items,
        CancellationToken cancellationToken = default);
}

public class AttributeValidationEvaluator(ApplicationDbContext db) : IAttributeValidationEvaluator
{
    public void ValidateDefinitionRules(string valueType, IEnumerable<AttributeValidation> validations)
    {
        var rules = validations.ToList();

        if (rules.Count == 0)
        {
            return;
        }

        var seenTypes = new HashSet<string>(StringComparer.Ordinal);

        foreach (var rule in rules)
        {
            var validationType = rule.ValidationType.Trim();

            if (!AttributeValidationTypes.IsValid(validationType))
            {
                throw new InvalidOperationException("error.attributes.invalidValidationType");
            }

            if (!AttributeValidationTypes.IsAllowedForValueType(validationType, valueType))
            {
                throw new InvalidOperationException("error.attributes.validationTypeNotAllowed");
            }

            if (!seenTypes.Add(validationType))
            {
                throw new InvalidOperationException("error.attributes.duplicateValidationType");
            }

            ValidateDefinitionValue(validationType, rule.ValidationValue);
        }
    }

    public async Task ValidateValueAsync(
        AttributeEntity attribute,
        string? value,
        IReadOnlyList<AttributeValidation> validations,
        CancellationToken cancellationToken = default)
    {
        if (validations.Count == 0 || string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        var fileSizes = await LoadFileSizesAsync([value], cancellationToken);

        foreach (var rule in validations)
        {
            var error = EvaluateRule(attribute.ValueType, value, rule, fileSizes);
            if (error is not null)
            {
                throw new AttributeValueValidationException(
                    new Dictionary<int, AttributeValidationFieldError> { [attribute.Id] = error });
            }
        }
    }

    public async Task ValidateBatchAsync(
        IReadOnlyDictionary<int, AttributeEntity> attributesById,
        IReadOnlyDictionary<int, IReadOnlyList<AttributeValidation>> validationsByAttributeId,
        IEnumerable<(int AttributeId, string? Value)> items,
        CancellationToken cancellationToken = default)
    {
        var itemList = items.ToList();
        var values = itemList.Select(item => item.Value);
        var fileSizes = await LoadFileSizesAsync(values, cancellationToken);
        var fieldErrors = new Dictionary<int, AttributeValidationFieldError>();

        foreach (var (attributeId, value) in itemList)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            if (!attributesById.TryGetValue(attributeId, out var attribute))
            {
                continue;
            }

            if (!validationsByAttributeId.TryGetValue(attributeId, out var validations) || validations.Count == 0)
            {
                continue;
            }

            foreach (var rule in validations)
            {
                var error = EvaluateRule(attribute.ValueType, value, rule, fileSizes);
                if (error is not null)
                {
                    fieldErrors[attributeId] = error;
                    break;
                }
            }
        }

        if (fieldErrors.Count > 0)
        {
            throw new AttributeValueValidationException(fieldErrors);
        }
    }

    private async Task<IReadOnlyDictionary<Guid, long>> LoadFileSizesAsync(
        IEnumerable<string?> values,
        CancellationToken cancellationToken)
    {
        var uids = values
            .Where(value => !string.IsNullOrWhiteSpace(value) && Guid.TryParse(value, out _))
            .Select(value => Guid.Parse(value!))
            .Distinct()
            .ToList();

        if (uids.Count == 0)
        {
            return new Dictionary<Guid, long>();
        }

        return await db.Files
            .AsNoTracking()
            .Where(file => uids.Contains(file.Uid))
            .ToDictionaryAsync(file => file.Uid, file => file.Size, cancellationToken);
    }

    private static void ValidateDefinitionValue(string validationType, string validationValue)
    {
        var trimmed = validationValue?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new InvalidOperationException("error.attributes.validationValueRequired");
        }

        switch (validationType)
        {
            case AttributeValidationTypes.MaxLength:
            case AttributeValidationTypes.MinLength:
                if (!int.TryParse(trimmed, NumberStyles.None, CultureInfo.InvariantCulture, out var length) || length < 0)
                {
                    throw new InvalidOperationException("error.attributes.invalidValidationLength");
                }

                break;

            case AttributeValidationTypes.MaxNumber:
            case AttributeValidationTypes.MinNumber:
                if (!decimal.TryParse(trimmed, NumberStyles.Number, CultureInfo.InvariantCulture, out _))
                {
                    throw new InvalidOperationException("error.attributes.invalidValidationNumber");
                }

                break;

            case AttributeValidationTypes.MaxFileSizeKb:
                if (!int.TryParse(trimmed, NumberStyles.None, CultureInfo.InvariantCulture, out var maxKb) || maxKb <= 0)
                {
                    throw new InvalidOperationException("error.attributes.invalidValidationFileSize");
                }

                break;

            case AttributeValidationTypes.Regex:
                try
                {
                    AttributeRegexParser.ValidatePattern(trimmed);
                }
                catch (ArgumentException)
                {
                    throw new InvalidOperationException("error.attributes.invalidValidationRegex");
                }

                break;
        }
    }

    private static AttributeValidationFieldError? EvaluateRule(
        string valueType,
        string value,
        AttributeValidation rule,
        IReadOnlyDictionary<Guid, long> fileSizes)
    {
        var validationType = rule.ValidationType.Trim();
        var validationValue = rule.ValidationValue.Trim();

        if (!AttributeValidationTypes.IsAllowedForValueType(validationType, valueType))
        {
            return null;
        }

        return validationType switch
        {
            AttributeValidationTypes.MaxLength when int.TryParse(validationValue, NumberStyles.None, CultureInfo.InvariantCulture, out var maxLength)
                && value.Length > maxLength => Error("error.attributes.validationMaxLength", "max", maxLength.ToString(CultureInfo.InvariantCulture)),

            AttributeValidationTypes.MinLength when int.TryParse(validationValue, NumberStyles.None, CultureInfo.InvariantCulture, out var minLength)
                && value.Length < minLength => Error("error.attributes.validationMinLength", "min", minLength.ToString(CultureInfo.InvariantCulture)),

            AttributeValidationTypes.MaxNumber when decimal.TryParse(validationValue, NumberStyles.Number, CultureInfo.InvariantCulture, out var maxNumber)
                && decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var actualMaxNumber)
                && actualMaxNumber > maxNumber => Error("error.attributes.validationMaxNumber", "max", FormatNumber(maxNumber)),

            AttributeValidationTypes.MinNumber when decimal.TryParse(validationValue, NumberStyles.Number, CultureInfo.InvariantCulture, out var minNumber)
                && decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var actualMinNumber)
                && actualMinNumber < minNumber => Error("error.attributes.validationMinNumber", "min", FormatNumber(minNumber)),

            AttributeValidationTypes.Regex when !AttributeRegexParser.IsMatch(value, validationValue)
                => Error("error.attributes.validationRegex", "pattern", validationValue),

            AttributeValidationTypes.MaxFileSizeKb
                when FileAttributeValueResolver.IsFileValueType(valueType)
                && Guid.TryParse(value, out var fileUid)
                && int.TryParse(validationValue, NumberStyles.None, CultureInfo.InvariantCulture, out var maxFileSizeKb)
                && fileSizes.TryGetValue(fileUid, out var fileSize)
                && fileSize > maxFileSizeKb * 1024L
                => Error("error.attributes.validationMaxFileSize", "max", maxFileSizeKb.ToString(CultureInfo.InvariantCulture)),

            _ => null,
        };
    }

    private static AttributeValidationFieldError Error(string message, string paramName, string paramValue) =>
        new()
        {
            Message = message,
            Params = new Dictionary<string, string> { [paramName] = paramValue },
        };

    private static string FormatNumber(decimal number) =>
        number.ToString("G29", CultureInfo.InvariantCulture);
}
