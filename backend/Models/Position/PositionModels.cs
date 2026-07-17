using System.ComponentModel.DataAnnotations;
using Backend.Api.Data.Enums;

namespace Backend.Api.Models.Position;

public class CreatePositionRequest
{
    [Required]
    [MaxLength(256)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(256)]
    public string Company { get; set; } = string.Empty;

    [MaxLength(256)]
    public string Country { get; set; } = string.Empty;

    public PositionLevel? Level { get; set; }

    public WorkFormat? Format { get; set; }

    [Range(0, int.MaxValue)]
    public int MaxProjects { get; set; }
}

public class UpdatePositionRequest : CreatePositionRequest
{
    public int Version { get; set; }
}

public class PositionRelationRequest
{
    public bool IsKey { get; set; }
}

public class SyncPositionRelationsRequest
{
    public IList<int> AttributeIds { get; set; } = [];

    public IList<int> TagIds { get; set; } = [];
}

public class DeletePositionItem
{
    public int Id { get; set; }

    public int Version { get; set; }
}

public class DeletePositionsRequest
{
    [Required]
    [MinLength(1)]
    public IList<DeletePositionItem> Items { get; set; } = [];
}

public class DuplicatePositionsRequest
{
    [Required]
    [MinLength(1)]
    public IList<int> Ids { get; set; } = [];
}

public class PositionAttributeDto
{
    public int AttributeId { get; set; }

    public string Name { get; set; } = string.Empty;

    public bool IsKey { get; set; }
}

public class PositionTagDto
{
    public int TagId { get; set; }

    public string Name { get; set; } = string.Empty;

    public bool IsKey { get; set; }
}

public class PositionListItemDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Company { get; set; } = string.Empty;

    public string Country { get; set; } = string.Empty;

    public PositionLevel Level { get; set; }

    public WorkFormat Format { get; set; }

    public int MaxProjects { get; set; }

    public DateTime CreatedAt { get; set; }

    public int Version { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    public int MessagesCount { get; set; }

    public int ResumesCount { get; set; }

    public bool HasRestrictions { get; set; }

    public IReadOnlyList<PositionAttributeDto> Attributes { get; set; } = [];

    public IReadOnlyList<PositionTagDto> Tags { get; set; } = [];
}

public class PositionDetailDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Company { get; set; } = string.Empty;

    public string Country { get; set; } = string.Empty;

    public PositionLevel Level { get; set; }

    public WorkFormat Format { get; set; }

    public int MaxProjects { get; set; }

    public DateTime CreatedAt { get; set; }

    public int Version { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    public int MessagesCount { get; set; }

    public int ResumesCount { get; set; }

    public bool HasRestrictions { get; set; }

    public IReadOnlyList<PositionAttributeDto> Attributes { get; set; } = [];

    public IReadOnlyList<PositionTagDto> Tags { get; set; } = [];
}
