namespace Backend.Api.Data.Seeders.MockData;

internal static class MockResumeDefinitions
{
    internal sealed record Assignment(string CandidateEmail, string[] PositionNames);

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
    ];
}
