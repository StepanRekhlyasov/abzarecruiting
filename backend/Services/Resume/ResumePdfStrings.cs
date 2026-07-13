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
        string emptyValue)
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
        attributes: "Атрибуты",
        projects: "Проекты",
        page: "Стр. ",
        present: "н.в.",
        attachedFile: "Прикреплённый файл",
        emptyValue: "—");

    private static readonly ResumePdfStrings English = new(
        forPosition: "Resume for position: {0}",
        candidateFallback: "Candidate",
        emailLabel: "email",
        phoneLabel: "tel.",
        locationLabel: "location",
        photoLabel: "Profile photo",
        attributes: "Attributes",
        projects: "Projects",
        page: "Page ",
        present: "present",
        attachedFile: "Attached file",
        emptyValue: "—");
}
