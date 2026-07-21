import type {
  AuthResponse,
  ConfirmEmailRequest,
  CurrentUserResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResultResponse,
} from '@shared/types'
import { API_BASE_URL, apiClient } from '@shared/api'
import { withApiError } from '@shared/lib/errors'
import { isAxiosError } from 'axios'
import { ROUTES } from '@shared/config/routes'

export type ExternalAuthProvider = 'google' | 'facebook'

export function isUnauthorizedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  return withApiError(async () => {
    const { data } = await apiClient.post<AuthResponse>('/Auth/login', request)
    return data
  })
}

export async function register(request: RegisterRequest): Promise<RegisterResultResponse> {
  return withApiError(async () => {
    const { data } = await apiClient.post<RegisterResultResponse>('/Auth/register', request)
    return data
  })
}

export async function confirmEmail(request: ConfirmEmailRequest): Promise<{ message: string }> {
  return withApiError(async () => {
    const { data } = await apiClient.post<{ message: string }>('/Auth/confirm-email', request)
    return data
  })
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const { data } = await apiClient.get<CurrentUserResponse>('/Auth/me')
  return data
}

export function getExternalLoginUrl(provider: ExternalAuthProvider): string {
  const returnUrl = `${window.location.origin}${ROUTES.authCallback}`
  const params = new URLSearchParams({ returnUrl })
  return `${API_BASE_URL}/Auth/external/${provider}?${params.toString()}`
}
