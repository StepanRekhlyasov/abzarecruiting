import { isAxiosError } from 'axios'
import type {
  CreateRestrictionRequest,
  RestrictionDto,
  UpdateRestrictionRequest,
} from '@shared/types'
import { apiClient } from '@shared/api'
import { parseApiError } from '@shared/lib/errors'

export async function fetchRestrictionsByPosition(
  positionId: number,
  options?: { signal?: AbortSignal },
): Promise<RestrictionDto[]> {
  try {
    const { data } = await apiClient.get<RestrictionDto[]>('/restrictions', {
      params: { positionId },
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

export async function createRestriction(request: CreateRestrictionRequest): Promise<RestrictionDto> {
  try {
    const { data } = await apiClient.post<RestrictionDto>('/restrictions', request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function updateRestriction(
  id: number,
  request: UpdateRestrictionRequest,
): Promise<RestrictionDto> {
  try {
    const { data } = await apiClient.post<RestrictionDto>(`/restrictions/${id}`, request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deleteRestriction(id: number, version: number): Promise<void> {
  try {
    await apiClient.delete(`/restrictions/${id}`, { params: { version } })
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export type SyncRestrictionItem = {
  id?: number
  version?: number
  attributeId?: number | null
  tagId?: number | null
  targetValue?: string | null
  condition: CreateRestrictionRequest['condition']
}

export type SyncRestrictionsRequest = {
  positionId: number
  items: SyncRestrictionItem[]
}

export async function syncRestrictions(
  request: SyncRestrictionsRequest,
): Promise<RestrictionDto[]> {
  try {
    const { data } = await apiClient.put<RestrictionDto[]>('/restrictions/sync', request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}
