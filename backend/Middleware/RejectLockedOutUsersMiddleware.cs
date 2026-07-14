using System.Text.Json;
using Backend.Api.Data;
using Backend.Api.Extensions;
using Microsoft.AspNetCore.Identity;

namespace Backend.Api.Middleware;

public class RejectLockedOutUsersMiddleware(RequestDelegate next)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task InvokeAsync(HttpContext context, UserManager<ApplicationUser> userManager)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userId = context.User.GetUserId();
            if (!string.IsNullOrWhiteSpace(userId))
            {
                var user = await userManager.FindByIdAsync(userId);
                if (user is not null && await userManager.IsLockedOutAsync(user))
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(
                        JsonSerializer.Serialize(new { message = "error.auth.userLockedOut" }, JsonOptions));
                    return;
                }
            }
        }

        await next(context);
    }
}
