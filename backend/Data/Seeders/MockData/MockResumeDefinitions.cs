namespace Backend.Api.Data.Seeders.MockData;

internal static class MockResumeDefinitions
{
    internal sealed record Assignment(
        string CandidateEmail,
        string[] PositionNames,
        bool ForcePublished = false);

    /// <summary>1–3 resumes per candidate on distinct seeded positions.</summary>
    public static IReadOnlyList<Assignment> All { get; } =
    [
        new(
            "user-1@fexpost.com",
            [
                "Junior .NET Backend Developer",
                "Middle React Frontend Engineer",
                "Senior Full-Stack Engineer",
            ]),
        new(
            "user-2@fexpost.com",
            [
                "Middle Go Backend Developer",
                "Junior Python Developer",
            ]),
        new(
            "user-3@fexpost.com",
            [
                "Junior UI Engineer",
                "Middle Mobile Engineer (React Native)",
                "Middle Flutter Developer",
            ]),
        new(
            "user-4@fexpost.com",
            [
                "Middle Data Engineer",
                "Senior Data Platform Lead",
            ]),
        new(
            "user-5@fexpost.com",
            [
                "Junior Business Analyst",
                "Middle DevOps Engineer",
                "Senior Security Engineer",
            ]),
        // Extra published CVs on positions that already have resumes.
        new("user-11@fexpost.com", ["Junior .NET Backend Developer"], ForcePublished: true),
        new("user-12@fexpost.com", ["Middle React Frontend Engineer"], ForcePublished: true),
        new("user-13@fexpost.com", ["Senior Full-Stack Engineer"], ForcePublished: true),
        new("user-14@fexpost.com", ["Middle Go Backend Developer"], ForcePublished: true),
        new("user-15@fexpost.com", ["Junior Python Developer"], ForcePublished: true),
        new("user-16@fexpost.com", ["Junior UI Engineer"], ForcePublished: true),
        new("user-17@fexpost.com", ["Middle Mobile Engineer (React Native)"], ForcePublished: true),
        new("user-18@fexpost.com", ["Middle Flutter Developer"], ForcePublished: true),
        new("user-19@fexpost.com", ["Middle Data Engineer"], ForcePublished: true),
        new("user-20@fexpost.com", ["Middle DevOps Engineer"], ForcePublished: true),
    ];
}
