using Backend.Api.Data;
using Backend.Api.Services.Files;
using Backend.Api.Services.Profile;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Data.Seeders;

public static class UserSeeder
{
    private const string SeedPassword = "1";
    private const string EmailDomain = "fexpost.com";

    /// <summary>Stable file uid shared by all seeded candidate default avatars.</summary>
    private static readonly Guid DefaultAvatarUid = Guid.Parse("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0001");

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

    private static readonly Dictionary<string, (string Phone, string Bio, string Location)> CandidateProfiles =
        new(StringComparer.OrdinalIgnoreCase)
        {
            [$"user-1@{EmailDomain}"] = (
                "+48 501 100 001",
                "Full-stack engineer focused on React and ASP.NET Core. Enjoys clean architecture and mentoring.",
                "Warsaw, Poland"),
            [$"user-2@{EmailDomain}"] = (
                "+48 501 100 002",
                "Backend engineer with Go and distributed systems experience. Interested in reliability and Kafka.",
                "Berlin, Germany"),
            [$"user-3@{EmailDomain}"] = (
                "+48 501 100 003",
                "Frontend developer specializing in Vue/React accessibility and design systems.",
                "Prague, Czech Republic"),
            [$"user-4@{EmailDomain}"] = (
                "+48 501 100 004",
                "Data engineer building ETL pipelines, warehouse models, and streaming integrations.",
                "Dublin, Ireland"),
            [$"user-5@{EmailDomain}"] = (
                "+48 501 100 005",
                "Product-minded .NET developer with FinTech and compliance-aware delivery experience.",
                "Stockholm, Sweden"),
        };

    public static async Task SeedAsync(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        IProfileAttributeService profileAttributeService,
        IFileStorageService fileStorageService,
        IWebHostEnvironment environment,
        ILogger logger)
    {
        var defaultAvatarUid = await EnsureDefaultAvatarAsync(db, fileStorageService, environment, logger);

        foreach (var seedUser in SeedUsers)
        {
            await EnsureUserAsync(
                userManager,
                profileAttributeService,
                logger,
                seedUser.Email,
                seedUser.FirstName,
                seedUser.LastName,
                seedUser.Role,
                defaultAvatarUid);
        }
    }

    private static async Task EnsureUserAsync(
        UserManager<ApplicationUser> userManager,
        IProfileAttributeService profileAttributeService,
        ILogger logger,
        string email,
        string firstName,
        string lastName,
        string role,
        Guid? defaultAvatarUid)
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
            var values = new Dictionary<string, string>
            {
                [DefaultAttributes.FirstName] = firstName,
                [DefaultAttributes.LastName] = lastName,
                [DefaultAttributes.Email] = email,
            };

            if (role == Roles.Candidate
                && CandidateProfiles.TryGetValue(email, out var profile))
            {
                values[DefaultAttributes.Phone] = profile.Phone;
                values[DefaultAttributes.Bio] = profile.Bio;
                values[DefaultAttributes.Location] = profile.Location;

                if (defaultAvatarUid is { } avatarUid)
                {
                    values[DefaultAttributes.Photo] = avatarUid.ToString();
                }
            }

            await profileAttributeService.SetStringValuesAsync(user.Id, values);
        }
        catch (InvalidOperationException exception)
        {
            logger.LogWarning(
                "User '{Email}' profile attributes were not set: {Message}",
                email,
                exception.Message);
        }
    }

    private static async Task<Guid?> EnsureDefaultAvatarAsync(
        ApplicationDbContext db,
        IFileStorageService fileStorageService,
        IWebHostEnvironment environment,
        ILogger logger)
    {
        var existing = await db.Files.FirstOrDefaultAsync(file => file.Uid == DefaultAvatarUid);
        if (existing is not null)
        {
            if (existing.Url.Contains("res.cloudinary.com", StringComparison.OrdinalIgnoreCase))
            {
                return existing.Uid;
            }

            db.Files.Remove(existing);
            await db.SaveChangesAsync();
        }

        var sourcePath = ResolveAvatarSourcePath(environment);
        if (!System.IO.File.Exists(sourcePath))
        {
            logger.LogWarning(
                "Default avatar source was not found at '{Path}'. Candidate photos were not seeded.",
                sourcePath);
            return null;
        }

        await using var stream = System.IO.File.OpenRead(sourcePath);
        if (stream.Length == 0)
        {
            logger.LogWarning("Default avatar file is empty: '{Path}'.", sourcePath);
            return null;
        }

        IFormFile formFile = new FormFile(stream, 0, stream.Length, "file", "avatar-default.svg")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/svg+xml",
        };

        try
        {
            var uploaded = await fileStorageService.SaveAsync(formFile, UploadKind.Image, DefaultAvatarUid);
            logger.LogInformation("Seeded default candidate avatar file '{Uid}'.", uploaded.Uid);
            return uploaded.Uid;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Failed to upload default avatar to Cloudinary.");
            return null;
        }
    }

    private static string ResolveAvatarSourcePath(IWebHostEnvironment environment)
    {
        var candidates = new[]
        {
            Path.Combine(environment.ContentRootPath, "Data", "Seeders", "Assets", "avatar-default.svg"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Seeders", "Assets", "avatar-default.svg"),
            Path.GetFullPath(Path.Combine(
                environment.ContentRootPath,
                "..",
                "frontend",
                "src",
                "assets",
                "avatar-default.svg")),
        };

        return candidates.FirstOrDefault(System.IO.File.Exists) ?? candidates[0];
    }
}
