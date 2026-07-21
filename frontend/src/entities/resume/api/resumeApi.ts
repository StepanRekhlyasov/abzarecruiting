import type {
  CreateResumeRequest,
  PagedResult,
  PaginationParams,
  ResumeDto,
  ResumeLikeStateDto,
  ResumeListItemDto,
  UpdateResumeRequest,
} from '@shared/types'
import { apiClient, downloadApiBlob, serializeListQueryParams } from '@shared/api'
import { withApiError } from '@shared/lib/errors'

type FetchResumesOptions = {
  signal?: AbortSignal
  candidateId?: string
  candidateIds?: string[]
  positionId?: number
  tagIds?: number[]
  published?: boolean
}

export async function fetchResumes(
  params: PaginationParams,
  options?: FetchResumesOptions,
): Promise<PagedResult<ResumeListItemDto>> {
  return withApiError(async () => {
    const { data } = await apiClient.get<PagedResult<ResumeListItemDto>>('/resume', {
      params: {
        ...params,
        candidateId: options?.candidateId,
        candidateIds: options?.candidateIds,
        positionId: options?.positionId,
        tagIds: options?.tagIds,
        published: options?.published,
      },
      paramsSerializer: serializeListQueryParams,
      signal: options?.signal,
    })
    return data
  })
}

export async function fetchResume(
  id: number,
  options?: FetchResumesOptions,
): Promise<ResumeDto> {
  return withApiError(async () => {
    const { data } = await apiClient.get<ResumeDto>(`/resume/${id}`, {
      signal: options?.signal,
    })
    return data
  })
}

export async function fetchResumePositionIds(options?: FetchResumesOptions): Promise<number[]> {
  return withApiError(async () => {
    const { data } = await apiClient.get<number[]>('/resume/position-ids', {
      signal: options?.signal,
    })
    return data
  })
}

export async function createResume(request: CreateResumeRequest): Promise<ResumeDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<ResumeDto>('/resume', request)
    return data
  })
}

export async function createResumesBatch(
  positionIds: number[],
  candidateId?: string,
): Promise<ResumeDto[]> {
  return withApiError(async () => {
    const { data } = await apiClient.post<ResumeDto[]>('/resume/batch', {
      positionIds,
      candidateId,
    })
    return data
  })
}

export async function updateResume(id: number, request: UpdateResumeRequest): Promise<ResumeDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<ResumeDto>(`/resume/${id}`, request)
    return data
  })
}

export async function toggleResumeLike(id: number): Promise<ResumeLikeStateDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<ResumeLikeStateDto>(`/resume/${id}/like`)
    return data
  })
}

export async function downloadResumePdf(
  id: number,
  lang?: string,
  frontendBaseUrl: string = window.location.origin,
): Promise<void> {
  await downloadApiBlob(
    () =>
      apiClient.get<Blob>(`/resume/${id}/pdf`, {
        params: {
          lang: lang || undefined,
          frontendBaseUrl,
        },
        responseType: 'blob',
      }),
    `resume-${id}.pdf`,
  )
}

export async function deleteResume(id: number, version: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/resume/${id}`, { params: { version } })
  })
}

export async function deleteResumesBatch(
  items: Array<{ id: number; version: number }>,
): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete('/resume/delete', { data: { items } })
  })
}
