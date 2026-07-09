import { isAxiosError } from 'axios'
import type {
  ChangeUsersRoleBatchRequest,
  CreateUserRequest,
  PagedResult,
  PaginationParams,
  UserListItem,
} from '@shared/types'
import { apiClient } from '@shared/api'
import { parseApiError } from '@shared/lib/errors'

type FetchUsersOptions = {
  signal?: AbortSignal
}

export async function fetchUsers(
  params: PaginationParams,
  options?: FetchUsersOptions,
): Promise<PagedResult<UserListItem>> {
  try {
    const { data } = await apiClient.get<PagedResult<UserListItem>>('/user', {
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

export async function createUser(request: CreateUserRequest): Promise<UserListItem> {
  try {
    const { data } = await apiClient.post<UserListItem>('/user', request)
    return data
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function changeUsersRoleBatch(request: ChangeUsersRoleBatchRequest): Promise<void> {
  try {
    await apiClient.post('/user/role', request)
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deleteUsersBatch(userIds: string[]): Promise<void> {
  try {
    await apiClient.delete('/user/delete', { data: { userIds } })
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}
