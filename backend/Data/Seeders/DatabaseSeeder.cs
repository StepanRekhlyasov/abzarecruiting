using Backend.Api.Configuration;
using Backend.Api.Services.Attributes;
using Backend.Api.Services.Files;
using Backend.Api.Services.Profile;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Data.Seeders;

public static class DatabaseSeeder
{
    public static async Task RunAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;

        var db = services.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();

        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        await IdentitySeeder.SeedRolesAsync(roleManager);

        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseSeeder");
        var defaultAttributesSettings = services.GetRequiredService<IOptions<DefaultAttributesSettings>>();
        var fileStorageService = services.GetRequiredService<IFileStorageService>();
        var profileAttributeService = services.GetRequiredService<IProfileAttributeService>();

        await AttributeSeeder.SeedAsync(
            db,
            userManager,
            profileAttributeService,
            defaultAttributesSettings,
            logger);
        await UserSeeder.SeedAsync(
            db,
            userManager,
            profileAttributeService,
            fileStorageService,
            app.Environment,
            logger);
        await MockDataSeeder.SeedAsync(db, userManager, logger);
        await DatabaseStartup.RebuildSearchIndexAsync(app.Services);

        logger.LogInformation("Database seeding completed.");
    }
}
