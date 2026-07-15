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
      this.socket = null
      if (!this.shouldReconnect) {
        return
      }

      this.reconnectTimer = window.setTimeout(() => {
        this.connect()
      }, RECONNECT_DELAY_MS)
    }
  }

  disconnect() {
    this.shouldReconnect = false

    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.socket?.close()
    this.socket = null
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler)
    this.connect()

    return () => {
      this.handlers.delete(handler)
      if (this.handlers.size === 0) {
        this.disconnect()
      }
    }
  }
}

export const notificationsSocket = new NotificationsSocket()
