import type {
  CreateTagRequest,
  DeleteTagItem,
  PagedResult,
  TagDto,
  TagListParams,
  UpdateTagRequest,
} from '@shared/types'
import { apiClient, serializeListQueryParams } from '@shared/api'
import { withApiError } from '@shared/lib/errors'

type FetchTagsOptions = {
  signal?: AbortSignal
}

export async function fetchTags(
  params: TagListParams,
  options?: FetchTagsOptions,
): Promise<PagedResult<TagDto>> {
  return withApiError(async () => {
    const { data } = await apiClient.get<PagedResult<TagDto>>('/tag', {
      params,
      paramsSerializer: serializeListQueryParams,
      signal: options?.signal,
    })
    return data
  })
}

export async function createTag(request: CreateTagRequest): Promise<TagDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<TagDto>('/tag', request)
    return data
  })
}

export async function ensureTags(names: string[]): Promise<TagDto[]> {
  const normalized = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
  if (normalized.length === 0) {
    return []
  }

  return withApiError(async () => {
    const { data } = await apiClient.post<TagDto[]>('/tag/ensure', { names: normalized })
    return data
  })
}

export async function updateTag(id: number, request: UpdateTagRequest): Promise<TagDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<TagDto>(`/tag/${id}`, request)
    return data
  })
}

export async function deleteTag(id: number, version: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/tag/${id}`, { params: { version } })
  })
}

export async function deleteTagsBatch(items: DeleteTagItem[]): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete('/tag/delete', { data: { items } })
  })
}
