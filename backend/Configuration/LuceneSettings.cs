namespace Backend.Api.Configuration;

public class LuceneSettings
{
    public const string SectionName = "Lucene";

    public string IndexPath { get; set; } = "lucene-index";
}
