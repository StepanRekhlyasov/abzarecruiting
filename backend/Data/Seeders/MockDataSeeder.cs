using Backend.Api.Data.Entities;
using Backend.Api.Data.Relations;
using Backend.Api.Data.Seeders.MockData;
using Backend.Api.Services.Attribute;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Data.Seeders;

public static class MockDataSeeder
{
    private const string AdminEmail = "srekhlyasov@gmail.com";

    public static async Task SeedAsync(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        ILogger logger)
    {
        var admin = await userManager.FindByEmailAsync(AdminEmail);
        if (admin is null)
        {
            logger.LogWarning(
                "Mock data seeding skipped: admin user '{Email}' was not found.",
                AdminEmail);
            return;
        }

        var adminId = admin.Id;
        var createdAt = DateTime.UtcNow;

        var attributesByName = await SeedAttributesAsync(db, adminId, createdAt, logger);
        await SeedAttributeValidationsAsync(db, attributesByName, logger);
        var tagsByName = await SeedTagsAsync(db, adminId, createdAt, logger);
        await SeedPositionsAsync(db, adminId, createdAt, attributesByName, tagsByName, logger);
        await SeedProjectsAsync(db, userManager, createdAt, tagsByName, logger);
        await SeedMessagesAsync(db, userManager, createdAt, logger);
        await SeedResumesAsync(db, userManager, createdAt, logger);
        await SeedResumeLikesAsync(db, userManager, createdAt, logger);
    }

    private static async Task<Dictionary<string, AttributeEntity>> SeedAttributesAsync(
        ApplicationDbContext db,
        string adminId,
        DateTime createdAt,
        ILogger logger)
    {
        var definitions = MockAttributeDefinitions.All;
        var nameSet = definitions.Select(definition => definition.Name).ToHashSet(StringComparer.Ordinal);
        var existing = (await db.Attributes
                .Include(attribute => attribute.Options)
                .ToListAsync())
            .Where(attribute => nameSet.Contains(attribute.Name))
            .ToList();

        var byName = existing.ToDictionary(attribute => attribute.Name, StringComparer.Ordinal);
        var changed = false;

        foreach (var definition in definitions)
        {
            if (!byName.TryGetValue(definition.Name, out var attribute))
            {
                attribute = new AttributeEntity
                {
                    Name = definition.Name,
                    Description = definition.Description,
                    Category = definition.Category,
                    ValueType = definition.ValueType,
                    InputType = definition.InputType,
                    CreatedAt = createdAt,
                    CreatedById = adminId,
                };
                db.Attributes.Add(attribute);
                byName[definition.Name] = attribute;
                changed = true;
                continue;
            }

            if (attribute.Description != definition.Description)
            {
                attribute.Description = definition.Description;
                changed = true;
            }

            if (attribute.Category != definition.Category)
            {
                attribute.Category = definition.Category;
                changed = true;
            }

            if (attribute.ValueType != definition.ValueType)
            {
                attribute.ValueType = definition.ValueType;
                changed = true;
            }

            if (attribute.InputType != definition.InputType)
            {
                attribute.InputType = definition.InputType;
                changed = true;
            }

            if (attribute.CreatedById != adminId)
            {
                attribute.CreatedById = adminId;
                changed = true;
            }
        }

        if (changed)
        {
            await db.SaveChangesAsync();
        }

        foreach (var definition in definitions.Where(item => item.ValueType == "select"))
        {
            var attribute = byName[definition.Name];
            var expected = definition.Options ?? [];
            var existingOptions = attribute.Options
                .Select(option => option.InputOption)
                .ToHashSet(StringComparer.Ordinal);

            var missing = expected.Where(option => !existingOptions.Contains(option)).ToList();
            if (missing.Count == 0)
            {
                continue;
            }

            foreach (var option in missing)
            {
                db.AttributeOptions.Add(new AttributeOption
                {
                    AttributeId = attribute.Id,
                    InputOption = option,
                });
            }
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Mock attributes seeded ({Count}).", definitions.Count);
        return byName;
    }

    private static async Task SeedAttributeValidationsAsync(
        ApplicationDbContext db,
        IReadOnlyDictionary<string, AttributeEntity> attributesByName,
        ILogger logger)
    {
        var definitions = MockAttributeValidationDefinitions.All;
        var attributeIds = definitions
            .Select(definition => attributesByName.TryGetValue(definition.AttributeName, out var attribute)
                ? attribute.Id
                : (int?)null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        if (attributeIds.Count == 0)
        {
            logger.LogWarning("Mock attribute validations skipped: target attributes were not found.");
            return;
        }

        var attributes = await db.Attributes
            .Include(attribute => attribute.Validations)
            .Where(attribute => attributeIds.Contains(attribute.Id))
            .ToListAsync();
        var attributesById = attributes.ToDictionary(attribute => attribute.Id);

        var created = 0;
        var updated = 0;

        foreach (var group in definitions.GroupBy(definition => definition.AttributeName, StringComparer.Ordinal))
        {
            if (!attributesByName.TryGetValue(group.Key, out var attributeRef)
                || !attributesById.TryGetValue(attributeRef.Id, out var attribute))
            {
                continue;
            }

            var expected = group
                .GroupBy(definition => definition.ValidationType, StringComparer.Ordinal)
                .Select(item => item.Last())
                .ToList();
            var expectedTypes = expected.Select(item => item.ValidationType).ToHashSet(StringComparer.Ordinal);

            var stale = attribute.Validations
                .Where(validation => !expectedTypes.Contains(validation.ValidationType))
                .ToList();
            if (stale.Count > 0)
            {
                db.AttributeValidations.RemoveRange(stale);
            }

            foreach (var definition in expected)
            {
                var existing = attribute.Validations
                    .FirstOrDefault(validation => validation.ValidationType == definition.ValidationType);
                if (existing is null)
                {
                    attribute.Validations.Add(new AttributeValidation
                    {
                        AttributeId = attribute.Id,
                        ValidationType = definition.ValidationType,
                        ValidationValue = definition.ValidationValue,
                    });
                    created++;
                    continue;
                }

                if (existing.ValidationValue != definition.ValidationValue)
                {
                    existing.ValidationValue = definition.ValidationValue;
                    updated++;
                }
            }
        }

        if (created > 0 || updated > 0)
        {
            await db.SaveChangesAsync();
        }

        var attributeCount = definitions
            .Select(definition => definition.AttributeName)
            .Distinct(StringComparer.Ordinal)
            .Count(name => attributesByName.ContainsKey(name));

        logger.LogInformation(
            "Mock attribute validations seeded ({AttributeCount} attributes, created: {Created}, updated: {Updated}).",
            attributeCount,
            created,
            updated);
    }

    private static async Task<Dictionary<string, Tag>> SeedTagsAsync(
        ApplicationDbContext db,
        string adminId,
        DateTime createdAt,
        ILogger logger)
    {
        var names = MockTagDefinitions.All.ToList();
        var nameSet = names.ToHashSet(StringComparer.Ordinal);
        var existing = (await db.Tags.ToListAsync())
            .Where(tag => nameSet.Contains(tag.Name))
            .ToList();

        var byName = existing
            .GroupBy(tag => tag.Name, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);

        var changed = false;
        foreach (var name in names)
        {
            if (byName.TryGetValue(name, out var tag))
            {
                if (tag.CreatedById != adminId)
                {
                    tag.CreatedById = adminId;
                    changed = true;
                }

                continue;
            }

            tag = new Tag
            {
                Name = name,
                CreatedAt = createdAt,
                CreatedById = adminId,
            };
            db.Tags.Add(tag);
            byName[name] = tag;
            changed = true;
        }

        if (changed)
        {
            await db.SaveChangesAsync();
        }

        logger.LogInformation("Mock tags seeded ({Count}).", names.Count);
        return byName;
    }

    private static async Task SeedPositionsAsync(
        ApplicationDbContext db,
        string adminId,
        DateTime createdAt,
        IReadOnlyDictionary<string, AttributeEntity> attributesByName,
        IReadOnlyDictionary<string, Tag> tagsByName,
        ILogger logger)
    {
        var definitions = MockPositionDefinitions.All;
        var nameSet = definitions.Select(definition => definition.Name).ToHashSet(StringComparer.Ordinal);
        var existing = (await db.Positions
                .Include(position => position.PositionAttributes)
                .Include(position => position.PositionTags)
                .Include(position => position.PositionRestrictions)
                .ToListAsync())
            .Where(position => nameSet.Contains(position.Name))
            .ToList();

        var byName = existing.ToDictionary(position => position.Name, StringComparer.Ordinal);

        foreach (var definition in definitions)
        {
            if (!byName.TryGetValue(definition.Name, out var position))
            {
                position = new Position
                {
                    Name = definition.Name,
                    Company = definition.Company,
                    Country = definition.Country,
                    Description = definition.Description,
                    Level = definition.Level,
                    Format = definition.Format,
                    MaxProjects = definition.MaxProjects,
                    CreatedAt = createdAt,
                    CreatedById = adminId,
                };
                db.Positions.Add(position);
                byName[definition.Name] = position;
                await db.SaveChangesAsync();
            }
            else
            {
                var updated = false;
                if (position.Company != definition.Company)
                {
                    position.Company = definition.Company;
                    updated = true;
                }

                if (position.Country != definition.Country)
                {
                    position.Country = definition.Country;
                    updated = true;
                }

                if (position.Description != definition.Description)
                {
                    position.Description = definition.Description;
                    updated = true;
                }

                if (position.Level != definition.Level)
                {
                    position.Level = definition.Level;
                    updated = true;
                }

                if (position.Format != definition.Format)
                {
                    position.Format = definition.Format;
                    updated = true;
                }

                if (position.MaxProjects != definition.MaxProjects)
                {
                    position.MaxProjects = definition.MaxProjects;
                    updated = true;
                }

                if (position.CreatedById != adminId)
                {
                    position.CreatedById = adminId;
                    updated = true;
                }

                if (updated)
                {
                    await db.SaveChangesAsync();
                }
            }

            SyncPositionAttributes(db, position, definition.Attributes, attributesByName);
            SyncPositionTags(db, position, definition.Tags, tagsByName);
            SyncPositionRestrictions(db, position, definition.Restrictions, attributesByName, tagsByName, adminId, createdAt);
            await db.SaveChangesAsync();
        }

        logger.LogInformation("Mock positions seeded ({Count}).", definitions.Count);
    }

    private static void SyncPositionAttributes(
        ApplicationDbContext db,
        Position position,
        MockPositionDefinitions.AttributeLink[] expected,
        IReadOnlyDictionary<string, AttributeEntity> attributesByName)
    {
        var expectedIds = new HashSet<int>();
        foreach (var link in expected)
        {
            if (!attributesByName.TryGetValue(link.AttributeName, out var attribute))
            {
                continue;
            }

            expectedIds.Add(attribute.Id);
            var existing = position.PositionAttributes.FirstOrDefault(item => item.AttributeId == attribute.Id);
            if (existing is null)
            {
                position.PositionAttributes.Add(new PositionAttribute
                {
                    PositionId = position.Id,
                    AttributeId = attribute.Id,
                    IsKey = link.IsKey,
                });
            }
            else if (existing.IsKey != link.IsKey)
            {
                existing.IsKey = link.IsKey;
            }
        }

        var toRemove = position.PositionAttributes
            .Where(item => !expectedIds.Contains(item.AttributeId))
            .ToList();
        if (toRemove.Count > 0)
        {
            db.PositionAttributes.RemoveRange(toRemove);
        }
    }

    private static void SyncPositionTags(
        ApplicationDbContext db,
        Position position,
        MockPositionDefinitions.TagLink[] expected,
        IReadOnlyDictionary<string, Tag> tagsByName)
    {
        var expectedIds = new HashSet<int>();
        foreach (var link in expected)
        {
            if (!tagsByName.TryGetValue(link.TagName, out var tag))
            {
                continue;
            }

            expectedIds.Add(tag.Id);
            var existing = position.PositionTags.FirstOrDefault(item => item.TagId == tag.Id);
            if (existing is null)
            {
                position.PositionTags.Add(new PositionTag
                {
                    PositionId = position.Id,
                    TagId = tag.Id,
                    IsKey = link.IsKey,
                });
            }
            else if (existing.IsKey != link.IsKey)
            {
                existing.IsKey = link.IsKey;
            }
        }

        var toRemove = position.PositionTags
            .Where(item => !expectedIds.Contains(item.TagId))
            .ToList();
        if (toRemove.Count > 0)
        {
            db.PositionTags.RemoveRange(toRemove);
        }
    }

    private static void SyncPositionRestrictions(
        ApplicationDbContext db,
        Position position,
        MockPositionDefinitions.RestrictionDef[] expected,
        IReadOnlyDictionary<string, AttributeEntity> attributesByName,
        IReadOnlyDictionary<string, Tag> tagsByName,
        string adminId,
        DateTime createdAt)
    {
        if (position.PositionRestrictions.Count > 0)
        {
            db.PositionRestrictions.RemoveRange(position.PositionRestrictions);
            position.PositionRestrictions.Clear();
        }

        foreach (var restriction in expected)
        {
            int? attributeId = null;
            int? tagId = null;

            if (!string.IsNullOrWhiteSpace(restriction.AttributeName))
            {
                if (!attributesByName.TryGetValue(restriction.AttributeName, out var attribute))
                {
                    continue;
                }

                attributeId = attribute.Id;
            }

            if (!string.IsNullOrWhiteSpace(restriction.TagName))
            {
                if (!tagsByName.TryGetValue(restriction.TagName, out var tag))
                {
                    continue;
                }

                tagId = tag.Id;
            }

            position.PositionRestrictions.Add(new PositionRestriction
            {
                PositionId = position.Id,
                AttributeId = attributeId,
                TagId = tagId,
                Condition = restriction.Condition,
                TargetValue = restriction.TargetValue,
                CreatedAt = createdAt,
                CreatedById = adminId,
            });
        }
    }

    private static async Task SeedProjectsAsync(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        DateTime createdAt,
        IReadOnlyDictionary<string, Tag> tagsByName,
        ILogger logger)
    {
        var totalProjects = 0;

        foreach (var (email, definitions) in MockProjectDefinitions.ByCandidateEmail)
        {
            var candidate = await userManager.FindByEmailAsync(email);
            if (candidate is null)
            {
                logger.LogWarning("Mock projects skipped for missing candidate '{Email}'.", email);
                continue;
            }

            var projectNameSet = definitions.Select(definition => definition.Name).ToHashSet(StringComparer.Ordinal);
            var existingProjects = (await db.ProfileProjects
                    .Include(project => project.ProfileProjectTags)
                    .Where(project => project.CandidateId == candidate.Id)
                    .ToListAsync())
                .Where(project => projectNameSet.Contains(project.Name))
                .ToList();

            var byName = existingProjects.ToDictionary(project => project.Name, StringComparer.Ordinal);

            foreach (var definition in definitions)
            {
                var startAt = new DateTime(definition.StartYear, definition.StartMonth, 1, 0, 0, 0, DateTimeKind.Utc);
                DateTime? endAt = definition.EndYear is null || definition.EndMonth is null
                    ? null
                    : new DateTime(definition.EndYear.Value, definition.EndMonth.Value, 1, 0, 0, 0, DateTimeKind.Utc);

                if (!byName.TryGetValue(definition.Name, out var project))
                {
                    project = new ProfileProject
                    {
                        CandidateId = candidate.Id,
                        Name = definition.Name,
                        Description = definition.Description,
                        StartAt = startAt,
                        EndAt = endAt,
                        CreatedAt = createdAt,
                    };
                    db.ProfileProjects.Add(project);
                    await db.SaveChangesAsync();
                    byName[definition.Name] = project;
                }
                else
                {
                    var updated = false;
                    if (project.Description != definition.Description)
                    {
                        project.Description = definition.Description;
                        updated = true;
                    }

                    if (project.StartAt != startAt)
                    {
                        project.StartAt = startAt;
                        updated = true;
                    }

                    if (project.EndAt != endAt)
                    {
                        project.EndAt = endAt;
                        updated = true;
                    }

                    if (updated)
                    {
                        await db.SaveChangesAsync();
                    }
                }

                var expectedTagIds = new HashSet<int>();
                foreach (var tagName in definition.TagNames)
                {
                    if (!tagsByName.TryGetValue(tagName, out var tag))
                    {
                        continue;
                    }

                    expectedTagIds.Add(tag.Id);
                    if (project.ProfileProjectTags.Any(item => item.TagId == tag.Id))
                    {
                        continue;
                    }

                    project.ProfileProjectTags.Add(new ProfileProjectTag
                    {
                        ProfileProjectId = project.Id,
                        TagId = tag.Id,
                    });
                }

                var stale = project.ProfileProjectTags
                    .Where(item => !expectedTagIds.Contains(item.TagId))
                    .ToList();
                if (stale.Count > 0)
                {
                    db.ProfileProjectTags.RemoveRange(stale);
                }

                await db.SaveChangesAsync();
                totalProjects++;
            }
        }

        logger.LogInformation("Mock candidate projects seeded ({Count}).", totalProjects);
    }

    private static async Task SeedMessagesAsync(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        DateTime createdAt,
        ILogger logger)
    {
        var positionNames = MockPositionDefinitions.All.Select(definition => definition.Name).ToList();
        var positions = (await db.Positions.ToListAsync())
            .Where(position => positionNames.Contains(position.Name))
            .ToDictionary(position => position.Name, StringComparer.Ordinal);

        if (positions.Count == 0)
        {
            logger.LogWarning("Mock messages skipped: seeded positions were not found.");
            return;
        }

        var definitions = MockMessageDefinitions.Build(positionNames);
        var existingMessages = (await db.PositionMessages.ToListAsync())
            .Where(message => message.Content.Contains("<!--mock-message:", StringComparison.Ordinal))
            .ToList();

        static int? TryParseMarkerIndex(string content)
        {
            const string prefix = "<!--mock-message:";
            var start = content.IndexOf(prefix, StringComparison.Ordinal);
            if (start < 0)
            {
                return null;
            }

            start += prefix.Length;
            var end = content.IndexOf("-->", start, StringComparison.Ordinal);
            if (end < 0)
            {
                return null;
            }

            return int.TryParse(content[start..end], out var index) ? index : null;
        }

        var existingByIndex = existingMessages
            .Select(message => (Message: message, Index: TryParseMarkerIndex(message.Content)))
            .Where(item => item.Index is not null)
            .GroupBy(item => item.Index!.Value)
            .ToDictionary(group => group.Key, group => group.Select(item => item.Message).ToList());

        var authorCache = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        var created = 0;
        var updated = 0;
        var removed = 0;

        foreach (var definition in definitions)
        {
            if (!positions.TryGetValue(definition.PositionName, out var position))
            {
                continue;
            }

            if (!authorCache.TryGetValue(definition.AuthorEmail, out var authorId))
            {
                var author = await userManager.FindByEmailAsync(definition.AuthorEmail);
                authorId = author?.Id;
                authorCache[definition.AuthorEmail] = authorId;
            }

            if (string.IsNullOrWhiteSpace(authorId))
            {
                continue;
            }

            if (existingByIndex.TryGetValue(definition.Index, out var matches))
            {
                var primary = matches[0];
                if (primary.Content != definition.Content
                    || primary.PositionId != position.Id
                    || primary.CreatedById != authorId)
                {
                    primary.Content = definition.Content;
                    primary.PositionId = position.Id;
                    primary.CreatedById = authorId;
                    primary.CreatedAt = createdAt.AddMinutes(-definition.Index);
                    updated++;
                }

                if (matches.Count > 1)
                {
                    db.PositionMessages.RemoveRange(matches.Skip(1));
                    removed += matches.Count - 1;
                }

                continue;
            }

            db.PositionMessages.Add(new PositionMessage
            {
                PositionId = position.Id,
                Content = definition.Content,
                CreatedById = authorId,
                CreatedAt = createdAt.AddMinutes(-definition.Index),
            });
            created++;
        }

        // Drop mock messages with markers outside 1..100 or unparsable duplicates.
        var definedIndexes = definitions.Select(definition => definition.Index).ToHashSet();
        foreach (var (index, matches) in existingByIndex)
        {
            if (definedIndexes.Contains(index))
            {
                continue;
            }

            db.PositionMessages.RemoveRange(matches);
            removed += matches.Count;
        }

        if (created > 0 || updated > 0 || removed > 0)
        {
            await db.SaveChangesAsync();
        }

        logger.LogInformation(
            "Mock position messages synced (created: {Created}, updated: {Updated}, removed: {Removed}).",
            created,
            updated,
            removed);
    }

    private static async Task SeedResumesAsync(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        DateTime createdAt,
        ILogger logger)
    {
        var positionNameSet = MockResumeDefinitions.All
            .SelectMany(assignment => assignment.PositionNames)
            .ToHashSet(StringComparer.Ordinal);

        var positions = (await db.Positions
                .Include(position => position.PositionAttributes)
                .ThenInclude(link => link.Attribute)
                .ThenInclude(attribute => attribute.Options)
                .ToListAsync())
            .Where(position => positionNameSet.Contains(position.Name))
            .ToList();
        var positionsByName = positions.ToDictionary(position => position.Name, StringComparer.Ordinal);

        if (positionsByName.Count == 0)
        {
            logger.LogWarning("Mock resumes skipped: seeded positions were not found.");
            return;
        }

        var valueMapper = new AttributeValueMapper();
        var planned = new List<(ApplicationUser Candidate, Position Position, bool ForcePublished)>();

        foreach (var assignment in MockResumeDefinitions.All)
        {
            var candidate = await userManager.FindByEmailAsync(assignment.CandidateEmail);
            if (candidate is null)
            {
                logger.LogWarning("Mock resumes skipped for missing candidate '{Email}'.", assignment.CandidateEmail);
                continue;
            }

            foreach (var positionName in assignment.PositionNames)
            {
                if (!positionsByName.TryGetValue(positionName, out var position))
                {
                    logger.LogWarning("Mock resume skipped: position '{Name}' was not found.", positionName);
                    continue;
                }

                planned.Add((candidate, position, assignment.ForcePublished));
            }
        }

        await AppendExtraPublishedResumesForCandidateAsync(
            db,
            userManager,
            positionsByName,
            planned,
            logger);

        var created = 0;
        var published = 0;
        var unpublished = 0;

        for (var index = 0; index < planned.Count; index++)
        {
            var (candidate, position, forcePublished) = planned[index];
            var shouldPublish = forcePublished || index % 2 == 1;

            var resume = await db.Resumes
                .FirstOrDefaultAsync(item =>
                    item.CandidateId == candidate.Id && item.PositionId == position.Id);

            if (resume is null)
            {
                resume = new Resume
                {
                    CandidateId = candidate.Id,
                    PositionId = position.Id,
                    Published = false,
                    CreatedAt = createdAt.AddMinutes(-index),
                };
                db.Resumes.Add(resume);
                created++;
            }

            await EnsurePositionAttributesLinkedAsync(db, candidate.Id, position);

            if (shouldPublish)
            {
                FillPositionAttributeValues(db, valueMapper, candidate.Id, position, index);
                resume.Published = true;
                published++;
            }
            else
            {
                resume.Published = false;
                unpublished++;
            }

            await db.SaveChangesAsync();
        }

        logger.LogInformation(
            "Mock resumes seeded (created: {Created}, published: {Published}, unpublished: {Unpublished}, total: {Total}).",
            created,
            published,
            unpublished,
            planned.Count);
    }

    /// <summary>
    /// Extra published CVs for a fixed candidate used in local demos / reward unlock checks.
    /// </summary>
    private const string ExtraPublishedResumesCandidateId = "c59d562d-4148-4d4c-a87c-02df12978ff8";

    private static readonly string[] ExtraPublishedPositionNames =
    [
        "Senior Platform Engineer",
        "Junior QA Automation Engineer",
    ];

    private static async Task AppendExtraPublishedResumesForCandidateAsync(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        IReadOnlyDictionary<string, Position> positionsByName,
        List<(ApplicationUser Candidate, Position Position, bool ForcePublished)> planned,
        ILogger logger)
    {
        var candidate = await userManager.FindByIdAsync(ExtraPublishedResumesCandidateId);
        if (candidate is null)
        {
            logger.LogWarning(
                "Extra published resumes skipped: candidate '{CandidateId}' was not found.",
                ExtraPublishedResumesCandidateId);
            return;
        }

        var existingPositionIds = await db.Resumes
            .AsNoTracking()
            .Where(resume => resume.CandidateId == candidate.Id)
            .Select(resume => resume.PositionId)
            .ToListAsync();
        var occupiedPositionIds = existingPositionIds.ToHashSet();

        foreach (var item in planned.Where(item => item.Candidate.Id == candidate.Id))
        {
            occupiedPositionIds.Add(item.Position.Id);
        }

        var added = 0;
        foreach (var positionName in ExtraPublishedPositionNames)
        {
            if (!positionsByName.TryGetValue(positionName, out var position))
            {
                logger.LogWarning(
                    "Extra published resume skipped: position '{Name}' was not found.",
                    positionName);
                continue;
            }

            if (!occupiedPositionIds.Add(position.Id))
            {
                continue;
            }

            planned.Add((candidate, position, ForcePublished: true));
            added++;
        }

        if (added < ExtraPublishedPositionNames.Length)
        {
            foreach (var position in positionsByName.Values)
            {
                if (added >= ExtraPublishedPositionNames.Length)
                {
                    break;
                }

                if (!occupiedPositionIds.Add(position.Id))
                {
                    continue;
                }

                planned.Add((candidate, position, ForcePublished: true));
                added++;
            }
        }

        logger.LogInformation(
            "Planned {Count} extra published resume(s) for candidate '{CandidateId}'.",
            added,
            ExtraPublishedResumesCandidateId);
    }

    private static async Task SeedResumeLikesAsync(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        DateTime createdAt,
        ILogger logger)
    {
        var recruiterEmails = Enumerable.Range(6, 5)
            .Select(number => $"user-{number}@fexpost.com")
            .ToList();

        var recruiters = new List<ApplicationUser>();
        foreach (var email in recruiterEmails)
        {
            var recruiter = await userManager.FindByEmailAsync(email);
            if (recruiter is not null)
            {
                recruiters.Add(recruiter);
            }
        }

        if (recruiters.Count == 0)
        {
            logger.LogWarning("Mock resume likes skipped: no recruiters (user-6..user-10) were found.");
            return;
        }

        var publishedResumes = await db.Resumes
            .AsNoTracking()
            .Where(resume => resume.Published)
            .Select(resume => resume.Id)
            .OrderBy(id => id)
            .ToListAsync();

        if (publishedResumes.Count == 0)
        {
            logger.LogWarning("Mock resume likes skipped: no published resumes were found.");
            return;
        }

        var existingLikes = await db.LikesResumes
            .Where(like => publishedResumes.Contains(like.ResumeId))
            .ToListAsync();
        var existingKeys = existingLikes
            .Select(like => (like.UserId, like.ResumeId))
            .ToHashSet();

        var created = 0;
        for (var resumeIndex = 0; resumeIndex < publishedResumes.Count; resumeIndex++)
        {
            var resumeId = publishedResumes[resumeIndex];
            // 3..5 likes per published resume, deterministic by order.
            var likeCount = 3 + (resumeIndex % 3);

            for (var likeIndex = 0; likeIndex < likeCount && likeIndex < recruiters.Count; likeIndex++)
            {
                var recruiter = recruiters[likeIndex];
                if (!existingKeys.Add((recruiter.Id, resumeId)))
                {
                    continue;
                }

                db.LikesResumes.Add(new LikesResume
                {
                    UserId = recruiter.Id,
                    ResumeId = resumeId,
                    CreatedAt = createdAt.AddMinutes(-(resumeIndex * 10 + likeIndex)),
                });
                created++;
            }
        }

        if (created > 0)
        {
            await db.SaveChangesAsync();
        }

        logger.LogInformation(
            "Mock resume likes seeded (created: {Created}, published resumes: {ResumeCount}, recruiters: {RecruiterCount}).",
            created,
            publishedResumes.Count,
            recruiters.Count);
    }

    private static async Task EnsurePositionAttributesLinkedAsync(
        ApplicationDbContext db,
        string candidateId,
        Position position)
    {
        var attributeIds = position.PositionAttributes
            .Select(link => link.AttributeId)
            .Distinct()
            .ToList();

        if (attributeIds.Count == 0)
        {
            return;
        }

        var existingIds = await db.ProfileAttributes
            .Where(item => item.CandidateId == candidateId && attributeIds.Contains(item.AttributeId))
            .Select(item => item.AttributeId)
            .ToHashSetAsync();

        foreach (var attributeId in attributeIds)
        {
            if (existingIds.Contains(attributeId))
            {
                continue;
            }

            var attribute = position.PositionAttributes
                .Select(link => link.Attribute)
                .First(item => item.Id == attributeId);

            var profileAttribute = new ProfileAttribute
            {
                CandidateId = candidateId,
                AttributeId = attributeId,
            };

            var defaultValue = string.Equals(attribute.ValueType, "boolean", StringComparison.OrdinalIgnoreCase)
                ? "false"
                : string.Empty;
            new AttributeValueMapper().SetValue(profileAttribute, attribute, defaultValue);
            db.ProfileAttributes.Add(profileAttribute);
        }

        await db.SaveChangesAsync();
    }

    private static void FillPositionAttributeValues(
        ApplicationDbContext db,
        IAttributeValueMapper valueMapper,
        string candidateId,
        Position position,
        int seed)
    {
        var attributeIds = position.PositionAttributes
            .Select(link => link.AttributeId)
            .Distinct()
            .ToList();

        var profileAttributes = db.ProfileAttributes
            .Where(item => item.CandidateId == candidateId && attributeIds.Contains(item.AttributeId))
            .ToList();
        var profileByAttributeId = profileAttributes.ToDictionary(item => item.AttributeId);

        foreach (var link in position.PositionAttributes)
        {
            var attribute = link.Attribute;
            if (!profileByAttributeId.TryGetValue(attribute.Id, out var profileAttribute))
            {
                profileAttribute = new ProfileAttribute
                {
                    CandidateId = candidateId,
                    AttributeId = attribute.Id,
                };
                db.ProfileAttributes.Add(profileAttribute);
                profileByAttributeId[attribute.Id] = profileAttribute;
            }

            valueMapper.SetValue(profileAttribute, attribute, BuildSampleAttributeValue(attribute, seed));
        }
    }

    private static string BuildSampleAttributeValue(AttributeEntity attribute, int seed)
    {
        var valueType = attribute.ValueType.ToLowerInvariant();
        return valueType switch
        {
            "number" => ((seed % 9) + 1).ToString(System.Globalization.CultureInfo.InvariantCulture),
            "boolean" => seed % 2 == 0 ? "true" : "false",
            "date" => "2024-06-15",
            "select" => attribute.Options
                .OrderBy(option => option.Id)
                .Select(option => option.InputOption)
                .FirstOrDefault()
                ?? "Beginner",
            "text" => "Seeded professional notes for the mock CV attribute value used in demos.",
            "period" => "2021-01-01|2024-12-01",
            "string" when attribute.Name.Contains("URL", StringComparison.OrdinalIgnoreCase)
                => "https://www.linkedin.com/in/seeded-candidate",
            "string" when attribute.Name.Contains("GitHub", StringComparison.OrdinalIgnoreCase)
                => "seeded-dev",
            "string" => $"Seeded {attribute.Name} {seed + 1}",
            _ => $"seeded-{seed + 1}",
        };
    }
}
