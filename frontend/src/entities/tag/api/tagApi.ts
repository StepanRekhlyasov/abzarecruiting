import { isAxiosError } from 'axios'
import type {
  CreateTagRequest,
  DeleteTagItem,
  PagedResult,
  TagDto,
  TagListParams,
  UpdateTagRequest,
} from '@shared/types'
import { apiClient, serializeListQueryParams } from '@shared/api'
import { parseApiError } from '@shared/lib/errors'

type FetchTagsOptions = {
  signal?: AbortSignal
}

export async function fetchTags(
  params: TagListParams,
  options?: FetchTagsOptions,
): Promise<PagedResult<TagDto>> {
  try {
    const { data } = await apiClient.get<PagedResult<TagDto>>('/tag', {
      params,
      paramsSerializer: serializeListQueryParams,
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

export async function createTag(request: CreateTagRequest): Promise<TagDto> {
  try {
    const { data } = await apiClient.post<TagDto>('/tag', request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function ensureTags(names: string[]): Promise<TagDto[]> {
  const normalized = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
  if (normalized.length === 0) {
    return []
  }

  try {
    const { data } = await apiClient.post<TagDto[]>('/tag/ensure', { names: normalized })
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function updateTag(id: number, request: UpdateTagRequest): Promise<TagDto> {
  try {
    const { data } = await apiClient.post<TagDto>(`/tag/${id}`, request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deleteTag(id: number, version: number): Promise<void> {
  try {
    await apiClient.delete(`/tag/${id}`, { params: { version } })
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deleteTagsBatch(items: DeleteTagItem[]): Promise<void> {
  try {
    await apiClient.delete('/tag/delete', { data: { items } })
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}
