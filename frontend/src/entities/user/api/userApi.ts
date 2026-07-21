import type {
  ChangeUsersRoleBatchRequest,
  CreateUserRequest,
  PagedResult,
  UserListItem,
  UserListParams,
} from '@shared/types'
import { apiClient } from '@shared/api'
import { withApiError } from '@shared/lib/errors'

type FetchUsersOptions = {
  signal?: AbortSignal
}

export async function fetchUsers(
  params: UserListParams,
  options?: FetchUsersOptions,
): Promise<PagedResult<UserListItem>> {
  return withApiError(async () => {
    const { data } = await apiClient.get<PagedResult<UserListItem>>('/user', {
      params,
      signal: options?.signal,
    })
    return data
  })
}

export async function createUser(request: CreateUserRequest): Promise<UserListItem> {
  return withApiError(async () => {
    const { data } = await apiClient.post<UserListItem>('/user', request)
    return data
  })
}

export async function changeUsersRoleBatch(request: ChangeUsersRoleBatchRequest): Promise<void> {
  return withApiError(async () => {
    await apiClient.post('/user/role', request)
  })
}

export async function deleteUsersBatch(userIds: string[]): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete('/user/delete', { data: { userIds } })
  })
}

export async function setUserLockout(userId: string, locked: boolean): Promise<void> {
  return withApiError(async () => {
    await apiClient.post(`/user/${userId}/lockout`, { locked })
  })
}

export async function setUserActivation(userId: string, activated: boolean): Promise<void> {
  return withApiError(async () => {
    await apiClient.post(`/user/${userId}/activation`, { activated })
  })
}

export async function sendUserActivationEmail(userId: string, frontendBaseUrl: string): Promise<void> {
  return withApiError(async () => {
    await apiClient.post(`/user/${userId}/send-activation`, { frontendBaseUrl })
  })
}
