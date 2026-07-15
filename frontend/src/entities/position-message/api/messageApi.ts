import { isAxiosError } from 'axios'
import type { CreatePositionMessageRequest, PositionMessageDto } from '@shared/types'
import { apiClient } from '@shared/api'
import { parseApiError } from '@shared/lib/errors'

type FetchOptions = {
  signal?: AbortSignal
}

export async function fetchPositionMessages(
  positionId: number,
  options?: FetchOptions,
): Promise<PositionMessageDto[]> {
  try {
    const { data } = await apiClient.get<PositionMessageDto[]>(`/position/${positionId}/messages`, {
      signal: options?.signal,
    })
    return data
  } catch (error) {
    if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
      throw error
    }

    throw new Error(parseApiError(error))
  }
}

export async function createPositionMessage(
  positionId: number,
  request: CreatePositionMessageRequest,
): Promise<PositionMessageDto> {
  try {
    const { data } = await apiClient.post<PositionMessageDto>(
      `/position/${positionId}/messages`,
      request,
    )
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deletePositionMessage(positionId: number, messageId: number): Promise<void> {
  try {
    await apiClient.delete(`/position/${positionId}/messages/${messageId}`)
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}
