using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models.Message;

public class CreatePositionMessageRequest
{
    [Required]
    [MaxLength(8000)]
    public string Content { get; set; } = string.Empty;
}

public class PositionMessageDto
{
    public int Id { get; set; }

    public int PositionId { get; set; }

    public string Content { get; set; } = string.Empty;

    public string? CreatedById { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    public string CreatedByRole { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}

public class PositionMessageChangedEvent
{
    public string Type { get; set; } = string.Empty;

    public int PositionId { get; set; }

    public int MessagesCount { get; set; }

    public PositionMessageDto? Message { get; set; }

    public int? MessageId { get; set; }
}
