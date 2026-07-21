using System.Text.RegularExpressions;

namespace Backend.Api.Services.Attributes;

public static class AttributeRegexParser
{
    private static readonly Regex JsLiteralRegex = new(
        @"^/(?<pattern>(?:\\.|[^/])*)/(?<flags>[gimsuyd]*)$",
        RegexOptions.Compiled);

    public static bool IsMatch(string value, string input)
    {
        var (pattern, options) = Parse(input);
        return Regex.IsMatch(value, pattern, options);
    }

    public static void ValidatePattern(string input)
    {
        var (pattern, options) = Parse(input);
        _ = new Regex(pattern, options);
    }

    private static (string Pattern, RegexOptions Options) Parse(string input)
    {
        var trimmed = input.Trim();
        var match = JsLiteralRegex.Match(trimmed);
        if (match.Success)
        {
            return (match.Groups["pattern"].Value, ParseFlags(match.Groups["flags"].Value));
        }

        return (trimmed, RegexOptions.None);
    }

    private static RegexOptions ParseFlags(string flags)
    {
        var options = RegexOptions.None;

        foreach (var flag in flags)
        {
            options |= flag switch
            {
                'i' => RegexOptions.IgnoreCase,
                'm' => RegexOptions.Multiline,
                's' => RegexOptions.Singleline,
                'g' => RegexOptions.None,
                _ => RegexOptions.None,
            };
        }

        return options;
    }
}
