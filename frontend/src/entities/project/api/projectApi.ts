import { isAxiosError } from 'axios'
import type {
  CreateProjectRequest,
  PagedResult,
  PaginationParams,
  ProjectDto,
  UpdateProjectRequest,
} from '@shared/types'
import { apiClient } from '@shared/api'
import { parseApiError } from '@shared/lib/errors'

type FetchProjectsOptions = {
  signal?: AbortSignal
}

export async function fetchProjects(
  params: PaginationParams,
  options?: FetchProjectsOptions,
): Promise<PagedResult<ProjectDto>> {
  try {
    const { data } = await apiClient.get<PagedResult<ProjectDto>>('/project', {
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

export async function fetchProject(id: number): Promise<ProjectDto> {
  try {
    const { data } = await apiClient.get<ProjectDto>(`/project/${id}`)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function createProject(request: CreateProjectRequest): Promise<ProjectDto> {
  try {
    const { data } = await apiClient.post<ProjectDto>('/project', request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function updateProject(id: number, request: UpdateProjectRequest): Promise<ProjectDto> {
  try {
    const { data } = await apiClient.post<ProjectDto>(`/project/${id}`, request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deleteProject(id: number): Promise<void> {
  try {
    await apiClient.delete(`/project/${id}`)
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function upsertProjectTag(projectId: number, tagId: number): Promise<void> {
  try {
    await apiClient.post(`/project/${projectId}/tags/${tagId}`)
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deleteProjectTag(projectId: number, tagId: number): Promise<void> {
  try {
    await apiClient.delete(`/project/${projectId}/tags/${tagId}`)
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}
