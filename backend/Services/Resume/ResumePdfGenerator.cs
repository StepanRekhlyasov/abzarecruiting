using Backend.Api.Data;
using Backend.Api.Models.Files;
using Backend.Api.Models.Profile;
using Backend.Api.Models.Project;
using Backend.Api.Models.Resume;
using QuestPDF.Fluent;
using QuestPDF.Helpers;

namespace Backend.Api.Services.Resume;

public static class ResumePdfGenerator
{
    public static byte[] Generate(
        ResumeDto resume,
        byte[]? photoBytes = null,
        string? locale = null,
        string? resumeUrl = null)
    {
        var strings = ResumePdfStrings.ForLocale(locale);
        var fullName = BuildFullName(resume.Attributes, strings);
        var email = GetAttributeText(resume.Attributes, DefaultAttributes.Email, strings);
        var phone = GetAttributeText(resume.Attributes, DefaultAttributes.Phone, strings);
        var location = GetAttributeText(resume.Attributes, DefaultAttributes.Location, strings);
        var bio = GetAttributeText(resume.Attributes, DefaultAttributes.Bio, strings);

        var otherAttributes = resume.Attributes
            .Where(attribute => !IsHeaderAttribute(attribute.Name))
            .Where(attribute => !string.Equals(attribute.Name, DefaultAttributes.Photo, StringComparison.Ordinal))
            .Where(attribute => HasDisplayValue(attribute, strings))
            .ToList();

        return Document.Create(document =>
            {
                document.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(style => style.FontSize(11).FontColor(Colors.Grey.Darken3));

                    page.Header().Row(headerRow =>
                    {
                        headerRow.RelativeItem().Column(column =>
                        {
                            column.Item().Text(string.Format(strings.ForPosition, resume.PositionName))
                                .SemiBold()
                                .FontSize(20)
                                .FontColor(Colors.Blue.Darken2);

                            column.Item().PaddingTop(8).Text(fullName)
                                .SemiBold()
                                .FontSize(14)
                                .FontColor(Colors.Grey.Darken3);

                            if (photoBytes is { Length: > 0 } && ResumeImageHelper.IsSupportedImage(photoBytes))
                            {
                                column.Item().PaddingTop(4).Width(120).Height(120).Image(photoBytes).FitArea();
                            }

                            if (HasText(email, strings))
                            {
                                column.Item().PaddingTop(4).Text($"{strings.EmailLabel}: {email}").FontSize(10);
                            }

                            if (HasText(phone, strings))
                            {
                                column.Item().PaddingTop(2).Text($"{strings.PhoneLabel}: {phone}").FontSize(10);
                            }

                            if (HasText(location, strings))
                            {
                                column.Item().PaddingTop(2).Text($"{strings.LocationLabel}: {location}").FontSize(10);
                            }

                            if (HasText(bio, strings))
                            {
                                column.Item().PaddingTop(2).Text($"{strings.Bio}: {bio}").FontSize(10);
                            }
                        });

                        if (!string.IsNullOrWhiteSpace(resumeUrl))
                        {
                            headerRow.ConstantItem(72)
                                .Height(72)
                                .AspectRatio(1)
                                .AlignTop()
                                .Background(Colors.White)
                                .Svg(size => ResumeQrCodeGenerator.GenerateSvg(resumeUrl, size));
                        }
                    });

                    page.Content().PaddingTop(16).Column(column =>
                    {

                        if (otherAttributes.Count > 0)
                        {
                            column.Item().PaddingTop(12).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                            column.Spacing(10);

                            var groupedAttributes = otherAttributes
                                .GroupBy(attribute => attribute.Category)
                                .OrderBy(group => AttributeCategories.GetOrder(group.Key))
                                .ThenBy(group => group.Key, StringComparer.Ordinal);

                            foreach (var group in groupedAttributes)
                            {
                                column.Item().PaddingTop(4)
                                    .Text(strings.GetCategoryLabel(group.Key))
                                    .SemiBold()
                                    .FontSize(14)
                                    .FontColor(Colors.Blue.Darken2);

                                column.Item().Column(attrs =>
                                {
                                    attrs.Spacing(8);
                                    foreach (var attribute in group)
                                    {
                                        attrs.Item().Column(item =>
                                        {
                                            item.Item().Text(attribute.Name).SemiBold().FontSize(12);
                                            item.Item().Text(FormatValue(attribute.Value, attribute.ValueType, strings)).FontSize(10);
                                        });
                                    }
                                });
                            }
                        }

                        if (resume.Projects.Count > 0)
                        {
                            column.Item().PaddingTop(12).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                            column.Spacing(10);
                            column.Item().PaddingTop(4).Text(strings.Projects).SemiBold().FontSize(14).FontColor(Colors.Blue.Darken2);
                            column.Item().Column(projects =>
                            {
                                projects.Spacing(10);
                                foreach (var project in resume.Projects)
                                {
                                    projects.Item().Column(item =>
                                    {
                                        item.Item().Row(row =>
                                        {
                                            row.RelativeItem().Text(project.Name).SemiBold().FontSize(12);
                                            row.AutoItem().Text(FormatProjectPeriod(project, strings)).FontSize(9).FontColor(Colors.Grey.Darken1);
                                        });

                                        if (!string.IsNullOrWhiteSpace(project.Description))
                                        {
                                            item.Item().PaddingTop(2).Text(project.Description).FontSize(10);
                                        }

                                        if (project.Tags.Count > 0)
                                        {
                                            item.Item().PaddingTop(4).Text(string.Join(" · ", project.Tags.Select(tag => tag.Name)))
                                                .FontSize(9)
                                                .FontColor(Colors.Grey.Darken1);
                                        }
                                    });
                                }
                            });
                        }
                    });

                    page.Footer().AlignCenter().Text(text =>
                    {
                        text.Span(strings.Page);
                        text.CurrentPageNumber();
                        text.Span(" / ");
                        text.TotalPages();
                    });
                });
            })
            .GeneratePdf();
    }

    public static string BuildFileName(ResumeDto resume, string? locale = null)
    {
        var strings = ResumePdfStrings.ForLocale(locale);
        var fullName = BuildFullName(resume.Attributes, strings);
        var safeName = string.Join("_", fullName.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries))
            .Replace(' ', '_');
        if (string.IsNullOrWhiteSpace(safeName) || fullName == strings.CandidateFallback)
        {
            safeName = $"resume_{resume.Id}";
        }

        return $"{safeName}.pdf";
    }

    private static string BuildFullName(IReadOnlyList<ProfileAttributeDto> attributes, ResumePdfStrings strings)
    {
        var firstName = GetAttributeText(attributes, DefaultAttributes.FirstName, strings);
        var lastName = GetAttributeText(attributes, DefaultAttributes.LastName, strings);
        var fullName = $"{firstName} {lastName}".Trim();
        return string.IsNullOrWhiteSpace(fullName) || fullName == strings.EmptyValue
            ? strings.CandidateFallback
            : fullName;
    }

    private static bool IsHeaderAttribute(string name) =>
        name is DefaultAttributes.FirstName
            or DefaultAttributes.LastName
            or DefaultAttributes.Email
            or DefaultAttributes.Phone
            or DefaultAttributes.Location
            or DefaultAttributes.Photo
            or DefaultAttributes.Bio;

    private static string GetAttributeText(
        IReadOnlyList<ProfileAttributeDto> attributes,
        string name,
        ResumePdfStrings strings)
    {
        var attribute = attributes.FirstOrDefault(item => item.Name == name);
        return FormatValue(attribute?.Value, attribute?.ValueType, strings);
    }

    private static bool HasDisplayValue(ProfileAttributeDto attribute, ResumePdfStrings strings) =>
        HasText(FormatValue(attribute.Value, attribute.ValueType, strings), strings);

    private static bool HasText(string value, ResumePdfStrings strings) =>
        !string.IsNullOrWhiteSpace(value) && value != strings.EmptyValue;

    private static string FormatValue(object? value, string? valueType, ResumePdfStrings strings)
    {
        if (value is null)
        {
            return strings.EmptyValue;
        }

        if (value is FileAttributeValueDto file)
        {
            return string.IsNullOrWhiteSpace(file.Name) ? strings.AttachedFile : file.Name;
        }

        if (string.Equals(valueType, "boolean", StringComparison.OrdinalIgnoreCase)
            || value is bool)
        {
            return FormatBoolean(value, strings);
        }

        if (value is string text)
        {
            return string.IsNullOrWhiteSpace(text) ? strings.EmptyValue : text;
        }

        return value.ToString() ?? strings.EmptyValue;
    }

    private static string FormatBoolean(object value, ResumePdfStrings strings)
    {
        if (value is bool flag)
        {
            return flag ? strings.Yes : strings.No;
        }

        var text = value.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            return strings.EmptyValue;
        }

        if (bool.TryParse(text, out var parsed))
        {
            return parsed ? strings.Yes : strings.No;
        }

        return text;
    }

    private static string FormatProjectPeriod(ProjectDto project, ResumePdfStrings strings)
    {
        var start = project.StartAt.ToString("yyyy-MM-dd");
        var end = project.EndAt?.ToString("yyyy-MM-dd") ?? strings.Present;
        return $"{start} — {end}";
    }
}
