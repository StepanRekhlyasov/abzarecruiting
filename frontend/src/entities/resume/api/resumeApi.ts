import { isAxiosError } from 'axios'
import type { PagedResult, PaginationParams, ResumeDto, ResumeListItemDto } from '@shared/types'
import { apiClient } from '@shared/api'
import { parseApiError } from '@shared/lib/errors'

type FetchResumesOptions = {
  signal?: AbortSignal
}

export async function fetchResumes(
  params: PaginationParams,
  options?: FetchResumesOptions,
): Promise<PagedResult<ResumeListItemDto>> {
  try {
    const { data } = await apiClient.get<PagedResult<ResumeListItemDto>>('/resume', {
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

export async function fetchResumePositionIds(options?: FetchResumesOptions): Promise<number[]> {
  try {
    const { data } = await apiClient.get<number[]>('/resume/position-ids', {
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

export async function createResume(positionId: number): Promise<ResumeDto> {
  try {
    const { data } = await apiClient.post<ResumeDto>(`/resume/position/${positionId}`)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deleteResume(id: number, version: number): Promise<void> {
  try {
    await apiClient.delete(`/resume/${id}`, { params: { version } })
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}
