namespace Backend.Api.Services.Resume;

public sealed class ResumePdfStrings
{
    private ResumePdfStrings(
        string forPosition,
        string candidateFallback,
        string emailLabel,
        string phoneLabel,
        string locationLabel,
        string photoLabel,
        string attributes,
        string projects,
        string page,
        string present,
        string attachedFile,
        string emptyValue,
        string info,
        string bio,
        string yes,
        string no,
        IReadOnlyDictionary<string, string> categoryLabels)
    {
        ForPosition = forPosition;
        CandidateFallback = candidateFallback;
        EmailLabel = emailLabel;
        PhoneLabel = phoneLabel;
        LocationLabel = locationLabel;
        PhotoLabel = photoLabel;
        Attributes = attributes;
        Projects = projects;
        Page = page;
        Present = present;
        AttachedFile = attachedFile;
        EmptyValue = emptyValue;
        Info = info;
        Bio = bio;
        Yes = yes;
        No = no;
        CategoryLabels = categoryLabels;
    }

    public string ForPosition { get; }
    public string CandidateFallback { get; }
    public string EmailLabel { get; }
    public string PhoneLabel { get; }
    public string LocationLabel { get; }
    public string PhotoLabel { get; }
    public string Attributes { get; }
    public string Projects { get; }
    public string Page { get; }
    public string Present { get; }
    public string AttachedFile { get; }
    public string EmptyValue { get; }
    public string Info { get; }
    public string Bio { get; }
    public string Yes { get; }
    public string No { get; }
    public IReadOnlyDictionary<string, string> CategoryLabels { get; }

    public string GetCategoryLabel(string category) =>
        CategoryLabels.TryGetValue(category, out var label) ? label : category;

    public static ResumePdfStrings ForLocale(string? locale)
    {
        var normalized = (locale ?? "ru").Trim().ToLowerInvariant();
        if (normalized.StartsWith("en", StringComparison.Ordinal))
        {
            return English;
        }

        return Russian;
    }

    private static readonly ResumePdfStrings Russian = new(
        forPosition: "Резюме для позиции: {0}",
        candidateFallback: "Кандидат",
        emailLabel: "email",
        phoneLabel: "tel.",
        locationLabel: "location",
        photoLabel: "Фото профиля",
        attributes: "Информация",
        projects: "Проекты",
        page: "Стр. ",
        present: "н.в.",
        attachedFile: "Прикреплённый файл",
        emptyValue: "—",
        info: "Личные данные",
        bio: "Биография",
        yes: "да",
        no: "нет",
        categoryLabels: new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [Data.AttributeCategories.PersonalInformation] = "Личные данные",
            [Data.AttributeCategories.HardSkills] = "Hard Skills",
            [Data.AttributeCategories.SoftSkills] = "Soft Skills",
            [Data.AttributeCategories.DomainKnowledge] = "Domain Knowledge",
            [Data.AttributeCategories.Certification] = "Сертификации",
        });

    private static readonly ResumePdfStrings English = new(
        forPosition: "Resume for position: {0}",
        candidateFallback: "Candidate",
        emailLabel: "email",
        phoneLabel: "tel.",
        locationLabel: "location",
        photoLabel: "Profile photo",
        attributes: "Info",
        projects: "Projects",
        page: "Page ",
        present: "present",
        attachedFile: "Attached file",
        emptyValue: "—",
        info: "Me",
        bio: "Bio",
        yes: "yes",
        no: "no",
        categoryLabels: new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [Data.AttributeCategories.PersonalInformation] = "Personal Information",
            [Data.AttributeCategories.HardSkills] = "Hard Skills",
            [Data.AttributeCategories.SoftSkills] = "Soft Skills",
            [Data.AttributeCategories.DomainKnowledge] = "Domain Knowledge",
            [Data.AttributeCategories.Certification] = "Certification",
        });
}
