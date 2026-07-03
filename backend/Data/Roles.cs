namespace Backend.Api.Data;

public static class Roles
{
    public const string Candidate = "Candidate";
    public const string Recruiter = "Recruiter";
    public const string Admin = "Admin";

    public static readonly string[] All = [Candidate, Recruiter, Admin];
}
