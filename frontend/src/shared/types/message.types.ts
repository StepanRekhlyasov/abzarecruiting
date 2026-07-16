export type PositionMessageDto = {
  id: number
  positionId: number
  content: string
  createdById: string | null
  createdByName: string
  createdByRole: string
  createdAt: string
}

export type CreatePositionMessageRequest = {
  content: string
}

export type PositionMessageCreatedEvent = {
  type: 'positionMessageCreated'
  positionId: number
  messagesCount: number
  message: PositionMessageDto
}

export type PositionMessageDeletedEvent = {
  type: 'positionMessageDeleted'
  positionId: number
  messagesCount: number
  messageId: number
}

export type PositionMessageWsEvent = PositionMessageCreatedEvent | PositionMessageDeletedEvent
