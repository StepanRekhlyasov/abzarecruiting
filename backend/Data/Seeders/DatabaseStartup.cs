using Backend.Api.Services.Search;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;

namespace Backend.Api.Data.Seeders;

public static class DatabaseStartup
{
    private static readonly TimeSpan MigrateRetryDelay = TimeSpan.FromSeconds(3);
    private const int MigrateMaxAttempts = 20;

    public static async Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseStartup");

        for (var attempt = 1; attempt <= MigrateMaxAttempts; attempt++)
        {
            try
            {
                await db.Database.MigrateAsync(cancellationToken);
                if (attempt > 1)
                {
                    logger.LogInformation("Database migration succeeded on attempt {Attempt}.", attempt);
                }

                return;
            }
            catch (Exception exception) when (attempt < MigrateMaxAttempts && IsTransientDatabaseError(exception))
            {
                logger.LogWarning(
                    exception,
                    "Database not ready (attempt {Attempt}/{MaxAttempts}). Retrying in {DelaySeconds}s...",
                    attempt,
                    MigrateMaxAttempts,
                    MigrateRetryDelay.TotalSeconds);
                await Task.Delay(MigrateRetryDelay, cancellationToken);
            }
        }
    }

    public static async Task RebuildSearchIndexAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
        logger.LogInformation("Rebuilding Lucene search index...");
        var searchIndex = scope.ServiceProvider.GetRequiredService<ISearchIndexService>();
        await searchIndex.RebuildAllAsync(cancellationToken);
    }

    private static bool IsTransientDatabaseError(Exception exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            if (current is MySqlException or TimeoutException or IOException)
            {
                return true;
            }

            if (current is InvalidOperationException
                && current.Message.Contains("connect", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}
