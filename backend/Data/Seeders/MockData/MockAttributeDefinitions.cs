using Backend.Api.Data;

namespace Backend.Api.Data.Seeders.MockData;

internal static class MockAttributeDefinitions
{
    internal sealed record Definition(
        string Name,
        string ValueType,
        string InputType,
        string Category,
        string Description,
        string[]? Options = null);

    private static readonly string[] ValueTypes =
    [
        "string", "text", "number", "boolean", "date", "select", "period", "image", "file",
    ];

    private static readonly Dictionary<string, string> InputByValueType = new()
    {
        ["string"] = "text",
        ["text"] = "textarea",
        ["number"] = "number",
        ["boolean"] = "checkbox",
        ["date"] = "date",
        ["select"] = "select",
        ["period"] = "period",
        ["image"] = "image",
        ["file"] = "file",
    };

    /// <summary>Exactly 100 attributes, ~evenly distributed across value types.</summary>
    public static IReadOnlyList<Definition> All { get; } = Build();

    private static IReadOnlyList<Definition> Build()
    {
        static (string Name, string Category, string Description, string[]? Options) Item(
            string name,
            string category,
            string description,
            string[]? options = null) =>
            (name, category, description, options);

        var byType = new Dictionary<string, List<(string Name, string Category, string Description, string[]? Options)>>
        {
            ["string"] =
            [
                Item("Preferred first name", AttributeCategories.PersonalInformation, "Preferred given name for communications."),
                Item("Middle name", AttributeCategories.PersonalInformation, "Optional middle name."),
                Item("LinkedIn profile URL", AttributeCategories.PersonalInformation, "Public LinkedIn profile link."),
                Item("GitHub username", AttributeCategories.HardSkills, "GitHub account username."),
                Item("Primary programming language", AttributeCategories.HardSkills, "Main language used in daily work."),
                Item("Secondary programming language", AttributeCategories.HardSkills, "Additional language with solid experience."),
                Item("Preferred IDE", AttributeCategories.HardSkills, "Default development environment."),
                Item("Cloud provider preference", AttributeCategories.HardSkills, "Preferred public cloud vendor."),
                Item("Database specialty", AttributeCategories.HardSkills, "Primary database technology focus."),
                Item("Communication style", AttributeCategories.SoftSkills, "Preferred communication approach."),
                Item("Leadership style", AttributeCategories.SoftSkills, "Typical leadership or mentoring style."),
                Item("Industry focus", AttributeCategories.DomainKnowledge, "Primary industry domain of expertise."),
            ],
            ["text"] =
            [
                Item("Professional summary", AttributeCategories.PersonalInformation, "Short professional bio."),
                Item("Career goals", AttributeCategories.PersonalInformation, "Near-term career objectives."),
                Item("Notable achievements", AttributeCategories.HardSkills, "Key technical achievements."),
                Item("Open source contributions", AttributeCategories.HardSkills, "Summary of OSS involvement."),
                Item("Architecture experience notes", AttributeCategories.HardSkills, "Notes on system design experience."),
                Item("Conflict resolution approach", AttributeCategories.SoftSkills, "How conflicts are typically handled."),
                Item("Team collaboration notes", AttributeCategories.SoftSkills, "Collaboration preferences and habits."),
                Item("Mentorship experience", AttributeCategories.SoftSkills, "Experience mentoring juniors."),
                Item("FinTech domain notes", AttributeCategories.DomainKnowledge, "Experience in financial services."),
                Item("Healthcare domain notes", AttributeCategories.DomainKnowledge, "Experience in healthcare systems."),
                Item("E-commerce domain notes", AttributeCategories.DomainKnowledge, "Experience in retail and e-commerce."),
                Item("Certification preparation notes", AttributeCategories.Certification, "Notes about ongoing certification prep."),
            ],
            ["number"] =
            [
                Item("Years of professional experience", AttributeCategories.HardSkills, "Total years of paid software experience."),
                Item("Years of backend experience", AttributeCategories.HardSkills, "Years focused on backend development."),
                Item("Years of frontend experience", AttributeCategories.HardSkills, "Years focused on frontend development."),
                Item("Years of DevOps experience", AttributeCategories.HardSkills, "Years focused on DevOps and platform."),
                Item("Team size led", AttributeCategories.SoftSkills, "Largest team size formally led."),
                Item("Projects delivered count", AttributeCategories.HardSkills, "Approximate number of delivered projects."),
                Item("IELTS overall score", AttributeCategories.Certification, "Overall IELTS band score."),
                Item("TOEFL score", AttributeCategories.Certification, "TOEFL iBT total score."),
                Item("AWS certified exams passed", AttributeCategories.Certification, "Number of AWS certification exams passed."),
                Item("SQL query complexity rating", AttributeCategories.HardSkills, "Self-rated SQL complexity comfort (1-10)."),
                Item("On-call shifts per month", AttributeCategories.HardSkills, "Typical monthly on-call shifts."),
                Item("Public talks given", AttributeCategories.SoftSkills, "Number of public technical talks."),
            ],
            ["boolean"] =
            [
                Item("Open to relocation", AttributeCategories.PersonalInformation, "Willing to relocate for work."),
                Item("Open to remote only", AttributeCategories.PersonalInformation, "Interested only in remote roles."),
                Item("Has work authorization EU", AttributeCategories.PersonalInformation, "Authorized to work in the EU."),
                Item("Comfortable with on-call", AttributeCategories.HardSkills, "Accepts on-call responsibilities."),
                Item("Experience with microservices", AttributeCategories.HardSkills, "Has built or maintained microservices."),
                Item("Experience with monoliths", AttributeCategories.HardSkills, "Has maintained large monoliths."),
                Item("Agile ceremony facilitation", AttributeCategories.SoftSkills, "Can facilitate Agile ceremonies."),
                Item("Public speaking experience", AttributeCategories.SoftSkills, "Has spoken at conferences or meetups."),
                Item("PCI DSS exposure", AttributeCategories.DomainKnowledge, "Worked under PCI DSS constraints."),
                Item("GDPR project experience", AttributeCategories.DomainKnowledge, "Worked on GDPR-compliant products."),
                Item("Active AWS certification", AttributeCategories.Certification, "Holds a currently valid AWS certification."),
            ],
            ["date"] =
            [
                Item("Available from", AttributeCategories.PersonalInformation, "Earliest start date."),
                Item("Current role start date", AttributeCategories.PersonalInformation, "Start date of current employment."),
                Item("Last promotion date", AttributeCategories.PersonalInformation, "Date of the most recent promotion."),
                Item("Last security training date", AttributeCategories.HardSkills, "Most recent security training completion."),
                Item("Last architecture review date", AttributeCategories.HardSkills, "Date of last formal architecture review led."),
                Item("Last performance review date", AttributeCategories.SoftSkills, "Date of last formal performance review."),
                Item("IELTS exam date", AttributeCategories.Certification, "Date when IELTS was taken."),
                Item("TOEFL exam date", AttributeCategories.Certification, "Date when TOEFL was taken."),
                Item("AWS certification expiry", AttributeCategories.Certification, "Expiry date of primary AWS cert."),
                Item("Kubernetes cert expiry", AttributeCategories.Certification, "Expiry date of Kubernetes certification."),
                Item("Domain compliance audit date", AttributeCategories.DomainKnowledge, "Date of last compliance audit participation."),
            ],
            ["select"] =
            [
                Item("English proficiency level", AttributeCategories.HardSkills, "CEFR English level.",
                    ["A1", "A2", "B1", "B2", "C1", "C2"]),
                Item("German proficiency level", AttributeCategories.HardSkills, "CEFR German level.",
                    ["A1", "A2", "B1", "B2", "C1", "C2", "None"]),
                Item("Spanish proficiency level", AttributeCategories.HardSkills, "CEFR Spanish level.",
                    ["A1", "A2", "B1", "B2", "C1", "C2", "None"]),
                Item("IELTS band", AttributeCategories.Certification, "IELTS overall band.",
                    ["5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0"]),
                Item("C# proficiency", AttributeCategories.HardSkills, "Self-assessed C# level.",
                    ["Beginner", "Intermediate", "Advanced", "Expert"]),
                Item("TypeScript proficiency", AttributeCategories.HardSkills, "Self-assessed TypeScript level.",
                    ["Beginner", "Intermediate", "Advanced", "Expert"]),
                Item("Python proficiency", AttributeCategories.HardSkills, "Self-assessed Python level.",
                    ["Beginner", "Intermediate", "Advanced", "Expert"]),
                Item("SQL proficiency", AttributeCategories.HardSkills, "Self-assessed SQL level.",
                    ["Beginner", "Intermediate", "Advanced", "Expert"]),
                Item("Data modeling experience", AttributeCategories.HardSkills, "Experience level with data modeling.",
                    ["None", "Basic", "Intermediate", "Advanced"]),
                Item("Preferred work culture", AttributeCategories.SoftSkills, "Preferred team culture style.",
                    ["Startup", "Scale-up", "Enterprise", "Agency"]),
                Item("Primary domain expertise", AttributeCategories.DomainKnowledge, "Strongest business domain.",
                    ["FinTech", "HealthTech", "E-commerce", "EdTech", "Telecom", "Gaming"]),
            ],
            ["period"] =
            [
                Item("Current employment period", AttributeCategories.PersonalInformation, "Start and end of current role."),
                Item("Most recent education period", AttributeCategories.PersonalInformation, "University or bootcamp period."),
                Item("Backend specialization period", AttributeCategories.HardSkills, "Period focused on backend work."),
                Item("Frontend specialization period", AttributeCategories.HardSkills, "Period focused on frontend work."),
                Item("Data engineering focus period", AttributeCategories.HardSkills, "Period focused on data pipelines."),
                Item("Team lead assignment period", AttributeCategories.SoftSkills, "Period serving as team lead."),
                Item("Scrum master assignment period", AttributeCategories.SoftSkills, "Period serving as Scrum Master."),
                Item("Banking project period", AttributeCategories.DomainKnowledge, "Period on banking products."),
                Item("Insurance project period", AttributeCategories.DomainKnowledge, "Period on insurance products."),
                Item("IELTS preparation period", AttributeCategories.Certification, "Period preparing for IELTS."),
                Item("Cloud certification study period", AttributeCategories.Certification, "Period preparing for cloud exams."),
            ],
            ["image"] =
            [
                Item("Passport photo scan", AttributeCategories.PersonalInformation, "Passport-style photo for HR."),
                Item("Whiteboard design sample", AttributeCategories.HardSkills, "Photo of a system design sketch."),
                Item("UI mockup sample", AttributeCategories.HardSkills, "Sample UI mockup image."),
                Item("Architecture diagram sample", AttributeCategories.HardSkills, "Sample architecture diagram."),
                Item("Team workshop photo", AttributeCategories.SoftSkills, "Photo from a facilitated workshop."),
                Item("Conference speaker photo", AttributeCategories.SoftSkills, "Photo from a speaking engagement."),
                Item("Domain process map", AttributeCategories.DomainKnowledge, "Image of a domain process map."),
                Item("Certificate badge image", AttributeCategories.Certification, "Digital badge or certificate image."),
                Item("IELTS TRF scan", AttributeCategories.Certification, "Scanned IELTS Test Report Form."),
                Item("AWS badge image", AttributeCategories.Certification, "AWS certification badge image."),
            ],
            ["file"] =
            [
                Item("CV document", AttributeCategories.PersonalInformation, "Latest CV or resume file."),
                Item("Cover letter", AttributeCategories.PersonalInformation, "Optional cover letter."),
                Item("Code sample archive", AttributeCategories.HardSkills, "Archive with anonymized code samples."),
                Item("Performance test report", AttributeCategories.HardSkills, "Load or performance test report."),
                Item("Security assessment report", AttributeCategories.HardSkills, "Security review or pentest summary."),
                Item("360 feedback summary", AttributeCategories.SoftSkills, "Anonymized 360 feedback export."),
                Item("Workshop facilitation guide", AttributeCategories.SoftSkills, "Facilitation notes or guide."),
                Item("Domain glossary document", AttributeCategories.DomainKnowledge, "Domain terminology glossary."),
                Item("Compliance checklist", AttributeCategories.DomainKnowledge, "Domain compliance checklist file."),
                Item("Certification transcript", AttributeCategories.Certification, "Official certification transcript."),
            ],
        };

        var result = new List<Definition>(100);
        foreach (var valueType in ValueTypes)
        {
            var inputType = InputByValueType[valueType];
            foreach (var item in byType[valueType])
            {
                result.Add(new Definition(
                    item.Name,
                    valueType,
                    inputType,
                    item.Category,
                    item.Description,
                    item.Options));
            }
        }

        if (result.Count != 100)
        {
            throw new InvalidOperationException($"Expected 100 mock attributes, got {result.Count}.");
        }

        return result;
    }
}
