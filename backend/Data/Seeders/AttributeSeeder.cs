using Backend.Api.Configuration;
using Backend.Api.Services.Profile;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Data.Seeders;

public static class AttributeSeeder
{
    private const string SystemUserFirstName = "Stepan";
    private const string SystemUserLastName = "Rekhliasov";

    public static async Task SeedAsync(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        IProfileAttributeService profileAttributeService,
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

        await RenameLegacyDefaultAttributesAsync(db, logger);

        var createdAt = DateTime.UtcNow;
        var changed = false;
        var defaultNames = DefaultAttributes.Names.ToHashSet();
        var existingDefaults = (await db.Attributes.ToListAsync())
            .Where(attribute => defaultNames.Contains(attribute.Name))
            .ToDictionary(attribute => attribute.Name);

        foreach (var definition in DefaultAttributes.All)
        {
            if (existingDefaults.TryGetValue(definition.Name, out var existing))
            {
                if (existing.Description != definition.Description)
                {
                    existing.Description = definition.Description;
                    changed = true;
                }

                if (existing.ValueType != definition.ValueType)
                {
                    existing.ValueType = definition.ValueType;
                    changed = true;
                }

                if (existing.InputType != definition.InputType)
                {
                    existing.InputType = definition.InputType;
                    changed = true;
                }

                if (existing.Category != definition.Category)
                {
                    existing.Category = definition.Category;
                    changed = true;
                }

                continue;
            }

            db.Attributes.Add(new AttributeEntity
            {
                Name = definition.Name,
                ValueType = definition.ValueType,
                InputType = definition.InputType,
                Category = definition.Category,
                Description = definition.Description,
                CreatedAt = createdAt,
                CreatedById = systemUserId,
            });
            changed = true;
        }

        if (changed)
        {
            await db.SaveChangesAsync();
            logger.LogInformation("Default profile attributes were seeded.");
        }

        try
        {
            var systemUser = await userManager.FindByIdAsync(systemUserId);
            await profileAttributeService.SetStringValuesAsync(systemUserId, new Dictionary<string, string>
            {
                [DefaultAttributes.FirstName] = SystemUserFirstName,
                [DefaultAttributes.LastName] = SystemUserLastName,
                [DefaultAttributes.Email] = systemUser?.Email ?? settings.Value.SystemUserEmail ?? string.Empty,
            });
        }
        catch (InvalidOperationException exception)
        {
            logger.LogWarning(
                "System user profile name was not set: {Message}",
                exception.Message);
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
            if (!await userManager.IsInRoleAsync(user, Roles.Admin))
            {
                await userManager.AddToRoleAsync(user, Roles.Admin);
                logger.LogInformation(
                    "System user '{Email}' was granted Admin role.",
                    settings.SystemUserEmail);
            }

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
