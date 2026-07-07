import { isAxiosError } from 'axios'
import type { AuthResponse, CurrentUserResponse, LoginRequest, RegisterRequest } from '@shared/types'
import { apiClient } from '@shared/api'

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

export function isUnauthorizedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  try {
    const { data } = await apiClient.post<AuthResponse>('/Auth/login', request)
    return data
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  try {
    const { data } = await apiClient.post<AuthResponse>('/Auth/register', request)
    return data
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const { data } = await apiClient.get<CurrentUserResponse>('/Auth/me')
  return data
}
