using Backend.Api.Services.Search;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Data.Seeders;

public static class DatabaseStartup
{
    public static async Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync(cancellationToken);
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
}
