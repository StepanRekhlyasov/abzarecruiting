import type {
  AttributeDto,
  AttributeListParams,
  CreateAttributeRequest,
  DeleteAttributeItem,
  PagedResult,
  UpdateAttributeRequest,
} from '@shared/types'
import { apiClient, serializeListQueryParams } from '@shared/api'
import { withApiError } from '@shared/lib/errors'

type FetchAttributesOptions = {
  signal?: AbortSignal
}

export async function fetchAttributes(
  params: AttributeListParams,
  options?: FetchAttributesOptions,
): Promise<PagedResult<AttributeDto>> {
  return withApiError(async () => {
    const { data } = await apiClient.get<PagedResult<AttributeDto>>('/attribute', {
      params,
      paramsSerializer: serializeListQueryParams,
      signal: options?.signal,
    })
    return data
  })
}

export async function createAttribute(request: CreateAttributeRequest): Promise<AttributeDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<AttributeDto>('/attribute', request)
    return data
  })
}

export async function updateAttribute(id: number, request: UpdateAttributeRequest): Promise<AttributeDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<AttributeDto>(`/attribute/${id}`, request)
    return data
  })
}

export async function deleteAttribute(id: number, version: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/attribute/${id}`, { params: { version } })
  })
}

export async function deleteAttributesBatch(items: DeleteAttributeItem[]): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete('/attribute/delete', { data: { items } })
  })
}

export async function linkAttributesToProfileBatch(
  attributeIds: number[],
  candidateId: string,
): Promise<void> {
  return withApiError(async () => {
    await apiClient.post(`/profile/${candidateId}/add`, { attributeIds })
  })
}

export async function unlinkAttributesFromProfileBatch(
  attributeIds: number[],
  candidateId: string,
): Promise<void> {
  return withApiError(async () => {
    await apiClient.post(`/profile/${candidateId}/remove`, { attributeIds })
  })
}

export async function fetchLinkedProfileAttributeIds(
  candidateId: string,
  options?: { signal?: AbortSignal },
): Promise<number[]> {
  return withApiError(async () => {
    const { data } = await apiClient.get<number[]>(`/profile/${candidateId}/attribute-ids`, {
      signal: options?.signal,
    })
    return data
  })
}
