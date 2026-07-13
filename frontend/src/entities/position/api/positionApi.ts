import { isAxiosError } from 'axios'
import type {
  CreatePositionRequest,
  PagedResult,
  PaginationParams,
  PositionDto,
  UpdatePositionRequest,
} from '@shared/types'
import { apiClient } from '@shared/api'
import { parseApiError } from '@shared/lib/errors'

type FetchPositionsOptions = {
  signal?: AbortSignal
}

export async function fetchPositions(
  params: PaginationParams,
  options?: FetchPositionsOptions,
): Promise<PagedResult<PositionDto>> {
  try {
    const { data } = await apiClient.get<PagedResult<PositionDto>>('/position', {
      params,
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

export async function fetchPosition(
  id: number,
  options?: FetchPositionsOptions,
): Promise<PositionDto> {
  try {
    const { data } = await apiClient.get<PositionDto>(`/position/${id}`, {
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

export async function createPosition(request: CreatePositionRequest): Promise<PositionDto> {
  try {
    const { data } = await apiClient.post<PositionDto>('/position', request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function updatePosition(id: number, request: UpdatePositionRequest): Promise<PositionDto> {
  try {
    const { data } = await apiClient.post<PositionDto>(`/position/${id}`, request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deletePosition(id: number, version: number): Promise<void> {
  try {
    await apiClient.delete(`/position/${id}`, { params: { version } })
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function upsertPositionAttribute(
  positionId: number,
  attributeId: number,
  isKey = true,
): Promise<void> {
  try {
    await apiClient.post(`/position/${positionId}/attributes/${attributeId}`, { isKey })
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deletePositionAttribute(positionId: number, attributeId: number): Promise<void> {
  try {
    await apiClient.delete(`/position/${positionId}/attributes/${attributeId}`)
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function upsertPositionTag(positionId: number, tagId: number, isKey = true): Promise<void> {
  try {
    await apiClient.post(`/position/${positionId}/tags/${tagId}`, { isKey })
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deletePositionTag(positionId: number, tagId: number): Promise<void> {
  try {
    await apiClient.delete(`/position/${positionId}/tags/${tagId}`)
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}
