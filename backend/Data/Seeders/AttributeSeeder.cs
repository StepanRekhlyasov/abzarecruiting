using Backend.Api.Configuration;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Data.Seeders;

public static class AttributeSeeder
{
    public static async Task SeedAsync(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        IOptions<DefaultAttributesSettings> settings,
        ILogger logger)
    {
        var systemUserId = await ResolveSystemUserIdAsync(userManager, settings.Value, logger);

        if (string.IsNullOrWhiteSpace(systemUserId))
        {
            logger.LogWarning(
                "Default attributes were not seeded: configure {UserId} or {Email} with {Password}.",
                $"{DefaultAttributesSettings.SectionName}:{nameof(DefaultAttributesSettings.SystemUserId)}",
                $"{DefaultAttributesSettings.SectionName}:{nameof(DefaultAttributesSettings.SystemUserEmail)}",
                $"{DefaultAttributesSettings.SectionName}:{nameof(DefaultAttributesSettings.SystemUserPassword)}");
            return;
        }

        var existingNames = await db.Attributes
            .Select(attribute => attribute.Name)
            .ToListAsync();

        var createdAt = DateTime.UtcNow;
        var added = false;

        foreach (var definition in DefaultAttributes.All)
        {
            if (existingNames.Contains(definition.Name))
            {
                continue;
            }

            db.Attributes.Add(new AttributeEntity
            {
                Name = definition.Name,
                ValueType = definition.ValueType,
                InputType = definition.InputType,
                Description = definition.Description,
                CreatedAt = createdAt,
                CreatedById = systemUserId,
            });
            added = true;
        }

        if (added)
        {
            await db.SaveChangesAsync();
            logger.LogInformation("Default profile attributes were seeded.");
        }
    }

    private static async Task<string?> ResolveSystemUserIdAsync(
        UserManager<ApplicationUser> userManager,
        DefaultAttributesSettings settings,
        ILogger logger)
    {
        if (!string.IsNullOrWhiteSpace(settings.SystemUserId))
        {
            if (await userManager.FindByIdAsync(settings.SystemUserId) is not null)
            {
                return settings.SystemUserId;
            }

            logger.LogWarning(
                "Configured system user '{SystemUserId}' was not found.",
                settings.SystemUserId);
            return null;
        }

        if (string.IsNullOrWhiteSpace(settings.SystemUserEmail))
        {
            return null;
        }

        var user = await userManager.FindByEmailAsync(settings.SystemUserEmail);
        if (user is not null)
        {
            return user.Id;
        }

        if (string.IsNullOrWhiteSpace(settings.SystemUserPassword))
        {
            return null;
        }

        user = new ApplicationUser
        {
            UserName = settings.SystemUserEmail,
            Email = settings.SystemUserEmail,
            CreatedAt = DateTime.UtcNow,
            EmailConfirmed = true,
        };

        var result = await userManager.CreateAsync(user, settings.SystemUserPassword);
        if (!result.Succeeded)
        {
            logger.LogWarning(
                "Failed to create system user '{Email}': {Errors}",
                settings.SystemUserEmail,
                string.Join(", ", result.Errors.Select(error => error.Description)));
            return null;
        }

        await userManager.AddToRoleAsync(user, Roles.Admin);
        logger.LogInformation("System user '{Email}' was created for default attributes.", settings.SystemUserEmail);

        return user.Id;
    }
}
