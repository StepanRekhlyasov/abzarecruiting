using Backend.Api.Data;
using Backend.Api.Services.Profile;
using Microsoft.AspNetCore.Identity;

namespace Backend.Api.Data.Seeders;

public static class UserSeeder
{
    private const string SeedPassword = "1";
    private const string EmailDomain = "fexpost.com";

    private static readonly (string Email, string FirstName, string LastName, string Role)[] SeedUsers =
    [
        ($"user-1@{EmailDomain}", "Anna", "Ivanova", Roles.Candidate),
        ($"user-2@{EmailDomain}", "Boris", "Petrov", Roles.Candidate),
        ($"user-3@{EmailDomain}", "Clara", "Smirnova", Roles.Candidate),
        ($"user-4@{EmailDomain}", "Dmitry", "Kozlov", Roles.Candidate),
        ($"user-5@{EmailDomain}", "Elena", "Volkova", Roles.Candidate),
        ($"user-6@{EmailDomain}", "Fedor", "Sokolov", Roles.Recruiter),
        ($"user-7@{EmailDomain}", "Galina", "Morozova", Roles.Recruiter),
        ($"user-8@{EmailDomain}", "Igor", "Novikov", Roles.Recruiter),
        ($"user-9@{EmailDomain}", "Julia", "Fedorova", Roles.Recruiter),
        ($"user-10@{EmailDomain}", "Kirill", "Orlov", Roles.Recruiter),
    ];

    public static async Task SeedAsync(
        UserManager<ApplicationUser> userManager,
        IProfileAttributeService profileAttributeService,
        ILogger logger)
    {
        foreach (var seedUser in SeedUsers)
        {
            await EnsureUserAsync(
                userManager,
                profileAttributeService,
                logger,
                seedUser.Email,
                seedUser.FirstName,
                seedUser.LastName,
                seedUser.Role);
        }
    }

    private static async Task EnsureUserAsync(
        UserManager<ApplicationUser> userManager,
        IProfileAttributeService profileAttributeService,
        ILogger logger,
        string email,
        string firstName,
        string lastName,
        string role)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                CreatedAt = DateTime.UtcNow,
                EmailConfirmed = true,
            };

            var result = await userManager.CreateAsync(user, SeedPassword);
            if (!result.Succeeded)
            {
                logger.LogWarning(
                    "Failed to seed user '{Email}': {Errors}",
                    email,
                    string.Join(", ", result.Errors.Select(error => error.Description)));
                return;
            }

            await userManager.AddToRoleAsync(user, role);
            logger.LogInformation("Seeded {Role} user '{Email}'.", role, email);
        }

        try
        {
            await profileAttributeService.SetStringValuesAsync(user.Id, new Dictionary<string, string>
            {
                [DefaultAttributes.FirstName] = firstName,
                [DefaultAttributes.LastName] = lastName,
            });
        }
        catch (InvalidOperationException exception)
        {
            logger.LogWarning(
                "User '{Email}' profile attributes were not set: {Message}",
                email,
                exception.Message);
        }
    }
}
