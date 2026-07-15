using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace Backend.Api.WebSockets;

public class NotificationWebSocketHandler
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ConcurrentDictionary<string, WebSocket> _sockets = new();

    public async Task HandleAsync(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        var clientId = Guid.NewGuid().ToString("N");
        _sockets[clientId] = webSocket;

        try
        {
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
            }
        }
        finally
        {
            _sockets.TryRemove(clientId, out _);
        }
    }

    public Task BroadcastAsync(object message) =>
        BroadcastAsync(message, CancellationToken.None);

    public async Task BroadcastAsync(object message, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(message, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        var dead = new List<string>();

        foreach (var (clientId, socket) in _sockets)
        {
            if (socket.State != WebSocketState.Open)
            {
                dead.Add(clientId);
                continue;
            }

            try
            {
                await socket.SendAsync(
                    bytes,
                    WebSocketMessageType.Text,
                    endOfMessage: true,
                    cancellationToken);
            }
            catch
            {
                dead.Add(clientId);
            }
        }

        foreach (var clientId in dead)
        {
            _sockets.TryRemove(clientId, out _);
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
