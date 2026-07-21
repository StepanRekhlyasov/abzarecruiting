import type { CreatePositionMessageRequest, PositionMessageDto } from '@shared/types'
import { apiClient } from '@shared/api'
import { withApiError } from '@shared/lib/errors'

type FetchOptions = {
  signal?: AbortSignal
}

export async function fetchPositionMessages(
  positionId: number,
  options?: FetchOptions,
): Promise<PositionMessageDto[]> {
  return withApiError(async () => {
    const { data } = await apiClient.get<PositionMessageDto[]>(`/position/${positionId}/messages`, {
      signal: options?.signal,
    })
    return data
  })
}

export async function createPositionMessage(
  positionId: number,
  request: CreatePositionMessageRequest,
): Promise<PositionMessageDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<PositionMessageDto>(
      `/position/${positionId}/messages`,
      request,
    )
    return data
  })
}

export async function deletePositionMessage(positionId: number, messageId: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/position/${positionId}/messages/${messageId}`)
  })
}
