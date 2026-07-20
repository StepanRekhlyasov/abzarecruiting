using Backend.Api.Data.Enums;

namespace Backend.Api.Models.Dashboard;

public class DashboardDto
{
    public IReadOnlyList<DashboardPositionDto> LatestPositions { get; set; } = [];

    public IReadOnlyList<DashboardPositionDto> PopularPositions { get; set; } = [];

    public IReadOnlyList<DashboardPositionDto> DiscussedPositions { get; set; } = [];

    public IReadOnlyList<DashboardTagDto> PositionsTagCloud { get; set; } = [];

    public IReadOnlyList<DashboardTagDto> ResumesTagCloud { get; set; } = [];

    public DashboardStatsDto Stats { get; set; } = new();
}

public class DashboardPositionDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Company { get; set; } = string.Empty;

    public string Country { get; set; } = string.Empty;

    public PositionLevel Level { get; set; }

    public WorkFormat Format { get; set; }

    public DateTime CreatedAt { get; set; }

    public int ResumesCount { get; set; }

    public int MessagesCount { get; set; }
}

public class DashboardTagDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Count { get; set; }
}

public class DashboardStatsDto
{
    public int CvsLast24Hours { get; set; }

    public int TotalPositions { get; set; }

    public int TotalCandidates { get; set; }

    public int TotalRecruiters { get; set; }

    public int TotalSubmittedCvs { get; set; }
}
