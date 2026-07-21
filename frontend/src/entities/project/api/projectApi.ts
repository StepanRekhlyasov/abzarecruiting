import type {
  CreateProjectRequest,
  PagedResult,
  PaginationParams,
  ProjectDto,
  UpdateProjectRequest,
} from '@shared/types'
import { apiClient, serializeListQueryParams } from '@shared/api'
import { withApiError } from '@shared/lib/errors'

type FetchProjectsOptions = {
  signal?: AbortSignal
  candidateId?: string
  candidateIds?: string[]
  tagIds?: number[]
}

export async function fetchProjects(
  params: PaginationParams,
  options?: FetchProjectsOptions,
): Promise<PagedResult<ProjectDto>> {
  return withApiError(async () => {
    const { data } = await apiClient.get<PagedResult<ProjectDto>>('/project', {
      params: {
        ...params,
        candidateId: options?.candidateId,
        candidateIds: options?.candidateIds,
        tagIds: options?.tagIds,
      },
      paramsSerializer: serializeListQueryParams,
      signal: options?.signal,
    })
    return data
  })
}

export async function fetchProject(id: number): Promise<ProjectDto> {
  return withApiError(async () => {
    const { data } = await apiClient.get<ProjectDto>(`/project/${id}`)
    return data
  })
}

export async function createProject(request: CreateProjectRequest): Promise<ProjectDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<ProjectDto>('/project', request)
    return data
  })
}

export async function updateProject(id: number, request: UpdateProjectRequest): Promise<ProjectDto> {
  return withApiError(async () => {
    const { data } = await apiClient.post<ProjectDto>(`/project/${id}`, request)
    return data
  })
}

export async function deleteProject(id: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/project/${id}`)
  })
}

export async function deleteProjectsBatch(ids: number[]): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete('/project/delete', { data: { ids } })
  })
}

export async function syncProjectTags(projectId: number, tagIds: number[]): Promise<void> {
  return withApiError(async () => {
    await apiClient.put(`/project/${projectId}/tags`, { tagIds })
  })
}

export async function upsertProjectTag(projectId: number, tagId: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.post(`/project/${projectId}/tags/${tagId}`)
  })
}

export async function deleteProjectTag(projectId: number, tagId: number): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/project/${projectId}/tags/${tagId}`)
  })
}
