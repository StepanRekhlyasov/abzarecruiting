import { isAxiosError } from 'axios'
import type {
  CreateResumeRequest,
  PagedResult,
  PaginationParams,
  ResumeDto,
  ResumeListItemDto,
  UpdateResumeRequest,
} from '@shared/types'
import { apiClient } from '@shared/api'
import { parseApiError } from '@shared/lib/errors'

type FetchResumesOptions = {
  signal?: AbortSignal
  candidateId?: string
  positionId?: number
}

export async function fetchResumes(
  params: PaginationParams,
  options?: FetchResumesOptions,
): Promise<PagedResult<ResumeListItemDto>> {
  try {
    const { data } = await apiClient.get<PagedResult<ResumeListItemDto>>('/resume', {
      params: {
        ...params,
        candidateId: options?.candidateId,
        positionId: options?.positionId,
      },
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

export async function fetchResume(
  id: number,
  options?: FetchResumesOptions,
): Promise<ResumeDto> {
  try {
    const { data } = await apiClient.get<ResumeDto>(`/resume/${id}`, {
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

export async function createResume(request: CreateResumeRequest): Promise<ResumeDto> {
  try {
    const { data } = await apiClient.post<ResumeDto>('/resume', request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function updateResume(id: number, request: UpdateResumeRequest): Promise<ResumeDto> {
  try {
    const { data } = await apiClient.post<ResumeDto>(`/resume/${id}`, request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function downloadResumePdf(id: number, lang?: string): Promise<void> {
  try {
    const { data, headers } = await apiClient.get<Blob>(`/resume/${id}/pdf`, {
      params: { lang: lang || undefined },
      responseType: 'blob',
    })

    const disposition = headers['content-disposition'] as string | undefined
    const fileNameMatch = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
    const fileName = fileNameMatch
      ? decodeURIComponent(fileNameMatch[1].replace(/"/g, ''))
      : `resume-${id}.pdf`

    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    if (isAxiosError(error) && error.response?.data instanceof Blob) {
      const text = await error.response.data.text()
      try {
        const parsed = JSON.parse(text) as { message?: string }
        throw new Error(parsed.message ?? parseApiError(error))
      } catch {
        throw new Error(parseApiError(error))
      }
    }

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
