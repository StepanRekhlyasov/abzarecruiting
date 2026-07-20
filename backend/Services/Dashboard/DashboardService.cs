using System.Security.Claims;
using Backend.Api.Data;
using Backend.Api.Extensions;
using Backend.Api.Models.Common;
using Backend.Api.Models.Dashboard;
using Backend.Api.Models.Position;
using Backend.Api.Services.Position;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Dashboard;

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(ClaimsPrincipal? user, CancellationToken cancellationToken = default);
}

public class DashboardService(
    ApplicationDbContext db,
    IPositionService positionService,
    IPositionRestrictionEvaluator restrictionEvaluator) : IDashboardService
{
    private const int PositionsLimit = 5;
    private const int TagCloudLimit = 40;

    public async Task<DashboardDto> GetAsync(
        ClaimsPrincipal? user,
        CancellationToken cancellationToken = default)
    {
        var latest = await positionService.GetListAsync(
            new PaginationParams
            {
                Page = 1,
                Size = PositionsLimit,
                SortBy = "createdAt",
                SortDir = "desc",
            },
            user,
            cancellationToken: cancellationToken);

        var popular = await positionService.GetListAsync(
            new PaginationParams
            {
                Page = 1,
                Size = PositionsLimit,
                SortBy = "resumesCount",
                SortDir = "desc",
            },
            user,
            cancellationToken: cancellationToken);

        var discussed = await positionService.GetListAsync(
            new PaginationParams
            {
                Page = 1,
                Size = PositionsLimit,
                SortBy = "messagesCount",
                SortDir = "desc",
            },
            user,
            cancellationToken: cancellationToken);

        var includePositionsTagCloud = user?.IsCandidate() == true || user?.IsAdmin() == true;
        var includeResumesTagCloud = user?.IsRecruiterOrAdmin() == true;

        var positionsTagCloud = includePositionsTagCloud
            ? await LoadPositionsTagCloudAsync(user, cancellationToken)
            : [];

        var resumesTagCloud = includeResumesTagCloud
            ? await LoadResumesTagCloudAsync(cancellationToken)
            : [];

        var stats = await LoadStatsAsync(cancellationToken);

        return new DashboardDto
        {
            LatestPositions = MapPositions(latest.Items),
            PopularPositions = MapPositions(popular.Items),
            DiscussedPositions = MapPositions(discussed.Items),
            PositionsTagCloud = positionsTagCloud,
            ResumesTagCloud = resumesTagCloud,
            Stats = stats,
        };
    }

    private async Task<List<DashboardTagDto>> LoadPositionsTagCloudAsync(
        ClaimsPrincipal? user,
        CancellationToken cancellationToken)
    {
        var allPositionIds = await db.Positions
            .AsNoTracking()
            .Select(position => position.Id)
            .ToListAsync(cancellationToken);

        if (allPositionIds.Count == 0)
        {
            return [];
        }

        IReadOnlyList<int> visiblePositionIds;

        if (user?.IsAdmin() == true)
        {
            visiblePositionIds = allPositionIds;
        }
        else if (user?.IsCandidate() == true)
        {
            var candidateId = user.GetUserId();
            if (string.IsNullOrWhiteSpace(candidateId))
            {
                return [];
            }

            var visible = await restrictionEvaluator.GetVisiblePositionIdsForCandidateAsync(
                candidateId,
                allPositionIds,
                cancellationToken);

            visiblePositionIds = allPositionIds.Where(id => visible.Contains(id)).ToList();
        }
        else
        {
            return [];
        }

        if (visiblePositionIds.Count == 0)
        {
            return [];
        }

        var visibleIdSet = visiblePositionIds.ToHashSet();

        var tags = await db.PositionTags
            .AsNoTracking()
            .Select(item => new { item.PositionId, item.TagId, item.Tag.Name })
            .ToListAsync(cancellationToken);

        return tags
            .Where(item => visibleIdSet.Contains(item.PositionId))
            .GroupBy(item => new { item.TagId, item.Name })
            .Select(group => new DashboardTagDto
            {
                Id = group.Key.TagId,
                Name = group.Key.Name,
                Count = group.Count(),
            })
            .OrderByDescending(tag => tag.Count)
            .ThenBy(tag => tag.Name)
            .Take(TagCloudLimit)
            .ToList();
    }

    private async Task<List<DashboardTagDto>> LoadResumesTagCloudAsync(
        CancellationToken cancellationToken)
    {
        return await (
            from resume in db.Resumes.AsNoTracking()
            where resume.Published
            join positionTag in db.PositionTags.AsNoTracking()
                on resume.PositionId equals positionTag.PositionId
            group positionTag by new { positionTag.TagId, positionTag.Tag.Name } into grouped
            select new DashboardTagDto
            {
                Id = grouped.Key.TagId,
                Name = grouped.Key.Name,
                Count = grouped.Count(),
            })
            .OrderByDescending(tag => tag.Count)
            .ThenBy(tag => tag.Name)
            .Take(TagCloudLimit)
            .ToListAsync(cancellationToken);
    }

    private async Task<DashboardStatsDto> LoadStatsAsync(CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddHours(-24);

        var cvsLast24Hours = await db.Resumes
            .AsNoTracking()
            .CountAsync(resume => resume.CreatedAt >= since, cancellationToken);

        var totalPositions = await db.Positions.AsNoTracking().CountAsync(cancellationToken);
        var totalSubmittedCvs = await db.Resumes.AsNoTracking().CountAsync(cancellationToken);

        var roleCounts = await (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            group userRole by role.Name into grouped
            select new { Role = grouped.Key, Count = grouped.Count() }
        ).ToListAsync(cancellationToken);

        var roleMap = roleCounts
            .Where(item => !string.IsNullOrWhiteSpace(item.Role))
            .ToDictionary(item => item.Role!, item => item.Count, StringComparer.OrdinalIgnoreCase);

        return new DashboardStatsDto
        {
            CvsLast24Hours = cvsLast24Hours,
            TotalPositions = totalPositions,
            TotalCandidates = roleMap.GetValueOrDefault(Roles.Candidate),
            TotalRecruiters = roleMap.GetValueOrDefault(Roles.Recruiter),
            TotalSubmittedCvs = totalSubmittedCvs,
        };
    }

    private static List<DashboardPositionDto> MapPositions(IReadOnlyList<PositionListItemDto> items) =>
        items
            .Select(item => new DashboardPositionDto
            {
                Id = item.Id,
                Name = item.Name,
                Company = item.Company,
                Country = item.Country,
                Level = item.Level,
                Format = item.Format,
                CreatedAt = item.CreatedAt,
                ResumesCount = item.ResumesCount,
                MessagesCount = item.MessagesCount,
            })
            .ToList();
}
