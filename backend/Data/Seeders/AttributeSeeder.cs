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

        var renamed = await RenameLegacyDefaultAttributesAsync(db, logger);
        if (renamed)
        {
            existingNames = await db.Attributes
                .Select(attribute => attribute.Name)
                .ToListAsync();
        }

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

    private static async Task<bool> RenameLegacyDefaultAttributesAsync(ApplicationDbContext db, ILogger logger)
    {
        var renamed = false;

        foreach (var (legacyName, currentName) in DefaultAttributes.LegacyNameMap)
        {
            var legacyAttribute = await db.Attributes
                .FirstOrDefaultAsync(attribute => attribute.Name == legacyName);

            if (legacyAttribute is null)
            {
                continue;
            }

            var currentExists = await db.Attributes
                .AnyAsync(attribute => attribute.Name == currentName && attribute.Id != legacyAttribute.Id);

            if (currentExists)
            {
                db.Attributes.Remove(legacyAttribute);
                logger.LogInformation(
                    "Removed legacy default attribute '{LegacyName}' because '{CurrentName}' already exists.",
                    legacyName,
                    currentName);
            }
            else
            {
                legacyAttribute.Name = currentName;
                logger.LogInformation(
                    "Renamed legacy default attribute '{LegacyName}' to '{CurrentName}'.",
                    legacyName,
                    currentName);
            }

            renamed = true;
        }

        if (renamed)
        {
            await db.SaveChangesAsync();
        }

        return renamed;
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
