using System.Text.Json;
using Backend.Api.Services.Attribute;

namespace Backend.Api.Middleware;

public class InvalidOperationExceptionMiddleware(RequestDelegate next)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (AttributeValueValidationException exception)
        {
            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                JsonSerializer.Serialize(
                    new
                    {
                        message = exception.Message,
                        fieldErrors = exception.FieldErrors.ToDictionary(
                            pair => pair.Key.ToString(),
                            pair => new
                            {
                                message = pair.Value.Message,
                                @params = pair.Value.Params,
                            }),
                    },
                    JsonOptions));
        }
        catch (InvalidOperationException exception)
        {
            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                JsonSerializer.Serialize(new { message = exception.Message }, JsonOptions));
        }
    }
}
