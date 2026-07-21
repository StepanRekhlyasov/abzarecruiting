import type {
  CreatePositionRequest,
  PagedResult,
  PaginationParams,
  PositionDto,
  UpdatePositionRequest,
} from '@shared/types'
import { apiClient, downloadApiBlob, serializeListQueryParams } from '@shared/api'
import { withApiError } from '@shared/lib/errors'

type FetchPositionsOptions = {
  signal?: AbortSignal
  tagIds?: number[]
}

export async function fetchPositions(
  params: PaginationParams,
  options?: FetchPositionsOptions,
): Promise<PagedResult<PositionDto>> {
  return withApiError(async () => {
    const { data } = await apiClient.get<PagedResult<PositionDto>>('/position', {
      params: {
        ...params,
        tagIds: options?.tagIds,
      },
      paramsSerializer: serializeListQueryParams,
      signal: options?.signal,
    })
    return data
  })
}

export async function fetchPosition(
  id: number,
  options?: FetchPositionsOptions,
): Promise<PositionDto> {
  return withApiError(async () => {
    const { data } = await apiClient.get<PositionDto>(`/position/${id}`, {
      signal: options?.signal,
    })
    return data
  })
}

export async function createPosition(request: CreatePositionRequest): Promise<PositionDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<PositionDto>('/position', request)
    return data
  })
}

export async function updatePosition(id: number, request: UpdatePositionRequest): Promise<PositionDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<PositionDto>(`/position/${id}`, request)
    return data
  })
}

export async function deletePosition(id: number, version: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/position/${id}`, { params: { version } })
  })
}

export async function deletePositionsBatch(
  items: Array<{ id: number; version: number }>,
): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete('/position/delete', { data: { items } })
  })
}

export async function duplicatePosition(id: number): Promise<PositionDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<PositionDto>(`/position/${id}/duplicate`)
    return data
  })
}

export async function duplicatePositionsBatch(ids: number[]): Promise<PositionDto[]> {
  return withApiError(async () => {
    const { data } = await apiClient.post<PositionDto[]>('/position/duplicate', { ids })
    return data
  })
}

export async function syncPositionRelations(
  positionId: number,
  attributeIds: number[],
  tagIds: number[],
): Promise<void> {
  return withApiError(async () => {
    await apiClient.put(`/position/${positionId}/relations`, { attributeIds, tagIds })
  })
}

export async function downloadPositionResumesCsv(positionId: number): Promise<void> {
  await downloadApiBlob(
    () =>
      apiClient.get<Blob>(`/position/${positionId}/resumes/csv`, {
        responseType: 'blob',
      }),
    `position-${positionId}-resumes.csv`,
  )
}

export async function upsertPositionAttribute(
  positionId: number,
  attributeId: number,
  isKey = true,
): Promise<void> {
  return withApiError(async () => {
    await apiClient.post(`/position/${positionId}/attributes/${attributeId}`, { isKey })
  })
}

export async function deletePositionAttribute(positionId: number, attributeId: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/position/${positionId}/attributes/${attributeId}`)
  })
}

export async function upsertPositionTag(positionId: number, tagId: number, isKey = true): Promise<void> {
  return withApiError(async () => {
    await apiClient.post(`/position/${positionId}/tags/${tagId}`, { isKey })
  })
}

export async function deletePositionTag(positionId: number, tagId: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/position/${positionId}/tags/${tagId}`)
  })
}
