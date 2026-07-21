namespace Backend.Api.Data.Entities;

public class File
{
    public Guid Uid { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public long Size { get; set; }
}
