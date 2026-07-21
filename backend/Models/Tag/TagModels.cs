using System.ComponentModel.DataAnnotations;
using Backend.Api.Models.Common;

namespace Backend.Api.Models.Tag;

public class TagListParams : PaginationParams
{
    public int[]? Ids { get; init; }

    public string[]? Searches { get; init; }
}

public class CreateTagRequest
{
    [Required]
    [MaxLength(256)]
    public string Name { get; set; } = string.Empty;
}

public class UpdateTagRequest : CreateTagRequest
{
    public int Version { get; set; }
}

public class EnsureTagsRequest
{
    [Required]
    [MinLength(1)]
    public IList<string> Names { get; set; } = [];
}

public class DeleteTagItem : VersionedId;

public class DeleteTagsRequest
{
    [Required]
    [MinLength(1)]
    public IList<DeleteTagItem> Items { get; set; } = [];
}

public class TagDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public int Version { get; set; }
}
