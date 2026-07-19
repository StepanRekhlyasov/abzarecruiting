import type { PositionMessageWsEvent } from '@shared/types'

type MessageHandler = (event: PositionMessageWsEvent) => void

const RECONNECT_DELAY_MS = 3000

function resolveWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/notifications`
}

class NotificationsSocket {
  private socket: WebSocket | null = null
  private handlers = new Set<MessageHandler>()
  private reconnectTimer: number | null = null
  private shouldReconnect = false

  connect() {
    this.shouldReconnect = true
    this.clearReconnectTimer()

    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    const socket = new WebSocket(resolveWsUrl())
    this.socket = socket

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as { type?: string }
        if (
          payload.type === 'positionMessageCreated' ||
          payload.type === 'positionMessageDeleted'
        ) {
          const messageEvent = payload as PositionMessageWsEvent
          for (const handler of this.handlers) {
            handler(messageEvent)
          }
        }
      } catch {
        // ignore malformed payloads
      }
    }

    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = null
      }

      if (!this.shouldReconnect) {
        return
      }

      this.clearReconnectTimer()
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, RECONNECT_DELAY_MS)
    }
  }

  disconnect() {
    this.shouldReconnect = false
    this.clearReconnectTimer()

    const socket = this.socket
    this.socket = null
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close()
    }
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler)

    return () => {
      this.handlers.delete(handler)
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

export const notificationsSocket = new NotificationsSocket()
