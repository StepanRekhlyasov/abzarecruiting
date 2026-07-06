import { isAxiosError } from 'axios'
import type { AttributeDto, CreateAttributeRequest, UpdateAttributeRequest } from '@entities/attribute'
import { apiClient } from '@shared/api'
import type { PagedResult, PaginationParams } from '@shared/model/pagination'

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

export async function fetchAttributes(params: PaginationParams): Promise<PagedResult<AttributeDto>> {
  try {
    const { data } = await apiClient.get<PagedResult<AttributeDto>>('/attribute', { params })
    return data
  } catch (error) {
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
  for (const attributeId of attributeIds) {
    await deleteAttribute(attributeId)
  }
}

export async function linkAttributeToProfile(
  attributeId: number,
  candidateId: string,
  value = '',
): Promise<void> {
  try {
    await apiClient.post(`/attribute/${attributeId}/candidate/${candidateId}`, { value })
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

export async function linkAttributesToProfileBatch(
  attributeIds: number[],
  candidateId: string,
  value = '',
): Promise<void> {
  await Promise.all(attributeIds.map((attributeId) => linkAttributeToProfile(attributeId, candidateId, value)))
}
