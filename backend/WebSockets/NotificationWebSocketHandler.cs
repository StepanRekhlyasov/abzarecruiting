using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace Backend.Api.WebSockets;

public class NotificationWebSocketHandler
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task HandleAsync(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        var clientId = Guid.NewGuid().ToString("N");

        await SendMessageAsync(webSocket, new
        {
            type = "connected",
            clientId,
            message = "WebSocket connection established.",
        });

        var buffer = new byte[1024 * 4];

        while (webSocket.State == WebSocketState.Open)
        {
            var result = await webSocket.ReceiveAsync(buffer, CancellationToken.None);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                await webSocket.CloseAsync(
                    WebSocketCloseStatus.NormalClosure,
                    "Connection closed by client.",
                    CancellationToken.None);
                break;
            }

            var payload = Encoding.UTF8.GetString(buffer, 0, result.Count);

            await SendMessageAsync(webSocket, new
            {
                type = "echo",
                receivedAt = DateTime.UtcNow,
                payload,
            });
        }
    }

    private static async Task SendMessageAsync(WebSocket webSocket, object message)
    {
        var json = JsonSerializer.Serialize(message, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);

        await webSocket.SendAsync(
            bytes,
            WebSocketMessageType.Text,
            endOfMessage: true,
            CancellationToken.None);
    }
}
