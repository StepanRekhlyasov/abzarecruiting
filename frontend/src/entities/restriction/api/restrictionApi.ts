import type {
  CreateRestrictionRequest,
  RestrictionDto,
  UpdateRestrictionRequest,
} from '@shared/types'
import { apiClient } from '@shared/api'
import { withApiError } from '@shared/lib/errors'

export async function fetchRestrictionsByPosition(
  positionId: number,
  options?: { signal?: AbortSignal },
): Promise<RestrictionDto[]> {
  return withApiError(async () => {
    const { data } = await apiClient.get<RestrictionDto[]>('/restrictions', {
      params: { positionId },
      signal: options?.signal,
    })
    return data
  })
}

export async function createRestriction(request: CreateRestrictionRequest): Promise<RestrictionDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<RestrictionDto>('/restrictions', request)
    return data
  })
}

export async function updateRestriction(
  id: number,
  request: UpdateRestrictionRequest,
): Promise<RestrictionDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<RestrictionDto>(`/restrictions/${id}`, request)
    return data
  })
}

export async function deleteRestriction(id: number, version: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/restrictions/${id}`, { params: { version } })
  })
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
  return withApiError(async () => {
    const { data } = await apiClient.put<RestrictionDto[]>('/restrictions/sync', request)
    return data
  })
}
