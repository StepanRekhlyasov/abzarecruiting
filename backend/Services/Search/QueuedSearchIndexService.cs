using System.Threading.Channels;

namespace Backend.Api.Services.Search;

internal readonly record struct SearchIndexJob(string Key, Func<ISearchIndexService, CancellationToken, Task> Run);

public sealed class SearchIndexQueue
{
    private readonly Channel<SearchIndexJob> _channel = Channel.CreateUnbounded<SearchIndexJob>(
        new UnboundedChannelOptions { SingleReader = true });
    private readonly HashSet<string> _pending = [];
    private readonly Lock _sync = new();

    public void Enqueue(string key, Func<ISearchIndexService, CancellationToken, Task> run)
    {
        lock (_sync)
        {
            if (!_pending.Add(key))
            {
                return;
            }
        }

        _channel.Writer.TryWrite(new SearchIndexJob(key, run));
    }

    internal async ValueTask<SearchIndexJob> ReadAsync(CancellationToken cancellationToken) =>
        await _channel.Reader.ReadAsync(cancellationToken);

    internal void Complete(SearchIndexJob job)
    {
        lock (_sync)
        {
            _pending.Remove(job.Key);
        }
    }
}

public sealed class SearchIndexBackgroundService(
    SearchIndexQueue queue,
    IServiceScopeFactory scopes,
    ILogger<SearchIndexBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var job = await queue.ReadAsync(stoppingToken);
            try
            {
                using var scope = scopes.CreateScope();
                await job.Run(scope.ServiceProvider.GetRequiredService<SearchIndexService>(), stoppingToken);
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Search index job {Key} failed", job.Key);
            }
            finally
            {
                queue.Complete(job);
            }
        }
    }
}

public sealed class QueuedSearchIndexService(SearchIndexQueue queue, IServiceScopeFactory scopes) : ISearchIndexService
{
    public Task RebuildResumeAsync(int resumeId, CancellationToken cancellationToken = default)
    {
        Enqueue($"resume:{resumeId}", (service, token) => service.RebuildResumeAsync(resumeId, token));
        return Task.CompletedTask;
    }

    public Task RebuildResumesAsync(IEnumerable<int> resumeIds, CancellationToken cancellationToken = default)
    {
        var ids = NormalizeIds(resumeIds);
        if (ids.Count == 0)
        {
            return Task.CompletedTask;
        }

        Enqueue($"resumes:{Join(ids)}", (service, token) => service.RebuildResumesAsync(ids, token));
        return Task.CompletedTask;
    }

    public Task RebuildResumesForCandidateAsync(string candidateId, CancellationToken cancellationToken = default)
    {
        Enqueue($"candidate-resumes:{candidateId}", (service, token) => service.RebuildResumesForCandidateAsync(candidateId, token));
        return Task.CompletedTask;
    }

    public Task RebuildResumesForCandidatesAsync(
        IEnumerable<string> candidateIds,
        CancellationToken cancellationToken = default)
    {
        var ids = NormalizeIds(candidateIds);
        if (ids.Count == 0)
        {
            return Task.CompletedTask;
        }

        Enqueue($"candidate-resumes:{Join(ids)}", (service, token) => service.RebuildResumesForCandidatesAsync(ids, token));
        return Task.CompletedTask;
    }

    public Task RebuildResumesForPositionAsync(int positionId, CancellationToken cancellationToken = default)
    {
        Enqueue($"position-resumes:{positionId}", (service, token) => service.RebuildResumesForPositionAsync(positionId, token));
        return Task.CompletedTask;
    }

    public Task RebuildPositionAsync(int positionId, CancellationToken cancellationToken = default)
    {
        Enqueue($"position:{positionId}", (service, token) => service.RebuildPositionAsync(positionId, token));
        return Task.CompletedTask;
    }

    public Task RebuildPositionsAsync(IEnumerable<int> positionIds, CancellationToken cancellationToken = default)
    {
        var ids = NormalizeIds(positionIds);
        if (ids.Count == 0)
        {
            return Task.CompletedTask;
        }

        Enqueue($"positions:{Join(ids)}", (service, token) => service.RebuildPositionsAsync(ids, token));
        return Task.CompletedTask;
    }

    public Task RebuildProjectAsync(int projectId, CancellationToken cancellationToken = default)
    {
        Enqueue($"project:{projectId}", (service, token) => service.RebuildProjectAsync(projectId, token));
        return Task.CompletedTask;
    }

    public Task RebuildProjectsAsync(IEnumerable<int> projectIds, CancellationToken cancellationToken = default)
    {
        var ids = NormalizeIds(projectIds);
        if (ids.Count == 0)
        {
            return Task.CompletedTask;
        }

        Enqueue($"projects:{Join(ids)}", (service, token) => service.RebuildProjectsAsync(ids, token));
        return Task.CompletedTask;
    }

    public Task RebuildAttributeAsync(int attributeId, CancellationToken cancellationToken = default)
    {
        Enqueue($"attribute:{attributeId}", (service, token) => service.RebuildAttributeAsync(attributeId, token));
        return Task.CompletedTask;
    }

    public Task RebuildAttributesAsync(IEnumerable<int> attributeIds, CancellationToken cancellationToken = default)
    {
        var ids = NormalizeIds(attributeIds);
        if (ids.Count == 0)
        {
            return Task.CompletedTask;
        }

        Enqueue($"attributes:{Join(ids)}", (service, token) => service.RebuildAttributesAsync(ids, token));
        return Task.CompletedTask;
    }

    public Task RebuildTagAsync(int tagId, CancellationToken cancellationToken = default)
    {
        Enqueue($"tag:{tagId}", (service, token) => service.RebuildTagAsync(tagId, token));
        return Task.CompletedTask;
    }

    public Task RebuildTagsAsync(IEnumerable<int> tagIds, CancellationToken cancellationToken = default)
    {
        var ids = NormalizeIds(tagIds);
        if (ids.Count == 0)
        {
            return Task.CompletedTask;
        }

        Enqueue($"tags:{Join(ids)}", (service, token) => service.RebuildTagsAsync(ids, token));
        return Task.CompletedTask;
    }

    public void DeleteResumes(IEnumerable<int> resumeIds)
    {
        var ids = NormalizeIds(resumeIds);
        if (ids.Count == 0)
        {
            return;
        }

        Enqueue($"delete-resumes:{Join(ids)}", (service, _) =>
        {
            service.DeleteResumes(ids);
            return Task.CompletedTask;
        });
    }

    public void DeletePositions(IEnumerable<int> positionIds)
    {
        var ids = NormalizeIds(positionIds);
        if (ids.Count == 0)
        {
            return;
        }

        Enqueue($"delete-positions:{Join(ids)}", (service, _) =>
        {
            service.DeletePositions(ids);
            return Task.CompletedTask;
        });
    }

    public void DeleteProjects(IEnumerable<int> projectIds)
    {
        var ids = NormalizeIds(projectIds);
        if (ids.Count == 0)
        {
            return;
        }

        Enqueue($"delete-projects:{Join(ids)}", (service, _) =>
        {
            service.DeleteProjects(ids);
            return Task.CompletedTask;
        });
    }

    public void DeleteAttributes(IEnumerable<int> attributeIds)
    {
        var ids = NormalizeIds(attributeIds);
        if (ids.Count == 0)
        {
            return;
        }

        Enqueue($"delete-attributes:{Join(ids)}", (service, _) =>
        {
            service.DeleteAttributes(ids);
            return Task.CompletedTask;
        });
    }

    public void DeleteTags(IEnumerable<int> tagIds)
    {
        var ids = NormalizeIds(tagIds);
        if (ids.Count == 0)
        {
            return;
        }

        Enqueue($"delete-tags:{Join(ids)}", (service, _) =>
        {
            service.DeleteTags(ids);
            return Task.CompletedTask;
        });
    }

    public async Task RebuildAllAsync(CancellationToken cancellationToken = default)
    {
        using var scope = scopes.CreateScope();
        await scope.ServiceProvider.GetRequiredService<SearchIndexService>().RebuildAllAsync(cancellationToken);
    }

    private void Enqueue(string key, Func<ISearchIndexService, CancellationToken, Task> run) =>
        queue.Enqueue(key, run);

    private static List<int> NormalizeIds(IEnumerable<int> ids) =>
        ids.Where(id => id > 0).Distinct().OrderBy(id => id).ToList();

    private static List<string> NormalizeIds(IEnumerable<string> ids) =>
        ids.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).OrderBy(id => id, StringComparer.Ordinal).ToList();

    private static string Join(IReadOnlyList<int> ids) => string.Join(',', ids);

    private static string Join(IReadOnlyList<string> ids) => string.Join(',', ids);
}
