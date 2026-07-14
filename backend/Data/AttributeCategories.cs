namespace Backend.Api.Data;

public static class AttributeCategories
{
    public const string PersonalInformation = "personalInformation";
    public const string HardSkills = "hardSkills";
    public const string SoftSkills = "softSkills";
    public const string DomainKnowledge = "domainKnowledge";
    public const string Certification = "certification";

    public static readonly string[] All =
    [
        PersonalInformation,
        HardSkills,
        SoftSkills,
        DomainKnowledge,
        Certification,
    ];

    public static bool IsValid(string? category) =>
        !string.IsNullOrWhiteSpace(category) && All.Contains(category);

    public static int GetOrder(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return int.MaxValue;
        }

        var index = Array.IndexOf(All, category);
        return index < 0 ? int.MaxValue : index;
    }
}
