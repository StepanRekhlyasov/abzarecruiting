import { isAxiosError } from 'axios'
import type {
  AttributeDto,
  CreateAttributeRequest,
  PagedResult,
  PaginationParams,
  UpdateAttributeRequest,
} from '@shared/types'
import { apiClient } from '@shared/api'

type FetchAttributesOptions = {
  signal?: AbortSignal
}

type ApiErrorBody = {
  message?: string
  errors?: string[]
}

function parseErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined

    if (body?.errors?.length) {
      return body.errors.join(' ')
    }

    if (body?.message) {
      return body.message
    }

    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Request failed'
}

export async function fetchAttributes(
  params: PaginationParams,
  options?: FetchAttributesOptions,
): Promise<PagedResult<AttributeDto>> {
  try {
    const { data } = await apiClient.get<PagedResult<AttributeDto>>('/attribute', {
      params,
      signal: options?.signal,
    })
    return data
  } catch (error) {
    if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
      throw error
    }

    throw new Error(parseErrorMessage(error))
  }
}

export async function createAttribute(request: CreateAttributeRequest): Promise<AttributeDto> {
  try {
    const { data } = await apiClient.post<AttributeDto>('/attribute', request)
    return data
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

export async function updateAttribute(id: number, request: UpdateAttributeRequest): Promise<AttributeDto> {
  try {
    const { data } = await apiClient.post<AttributeDto>(`/attribute/${id}`, request)
    return data
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

export async function deleteAttribute(id: number): Promise<void> {
  try {
    await apiClient.delete(`/attribute/${id}`)
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

export async function deleteAttributesBatch(attributeIds: number[]): Promise<void> {
  try {
    await apiClient.delete('/attribute/delete', { data: { ids: attributeIds } })
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

export async function linkAttributesToProfileBatch(
  attributeIds: number[],
  candidateId: string,
): Promise<void> {
  try {
    await apiClient.post(`/profile/${candidateId}/add`, { attributeIds })
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

export async function unlinkAttributesFromProfileBatch(
  attributeIds: number[],
  candidateId: string,
): Promise<void> {
  try {
    await apiClient.post(`/profile/${candidateId}/remove`, { attributeIds })
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

export async function fetchLinkedProfileAttributeIds(
  candidateId: string,
  options?: { signal?: AbortSignal },
): Promise<number[]> {
  try {
    const { data } = await apiClient.get<number[]>(`/profile/${candidateId}/attribute-ids`, {
      signal: options?.signal,
    })
    return data
  } catch (error) {
    if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
      throw error
    }

    throw new Error(parseErrorMessage(error))
  }
}
