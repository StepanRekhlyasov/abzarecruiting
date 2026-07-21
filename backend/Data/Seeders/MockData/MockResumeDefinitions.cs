namespace Backend.Api.Data.Seeders.MockData;

internal static class MockResumeDefinitions
{
    internal sealed record Assignment(
        string CandidateEmail,
        string[] PositionNames,
        bool ForcePublished = false);

    /// <summary>1–5 resumes per candidate on distinct seeded positions.</summary>
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
        // Former user-11..20 published CVs redistributed to user-1..5 on free positions.
        new(
            "user-1@fexpost.com",
            ["Senior Platform Engineer", "Junior QA Automation Engineer"],
            ForcePublished: true),
        new(
            "user-2@fexpost.com",
            ["Middle Node.js Backend Developer", "Middle Java Backend Engineer"],
            ForcePublished: true),
        new(
            "user-3@fexpost.com",
            ["Senior Solution Architect", "Senior Product Engineer"],
            ForcePublished: true),
        new(
            "user-4@fexpost.com",
            ["Junior Support Engineer", "Junior .NET Backend Developer"],
            ForcePublished: true),
        new(
            "user-5@fexpost.com",
            ["Middle Flutter Developer", "Middle React Frontend Engineer"],
            ForcePublished: true),
    ];
}
