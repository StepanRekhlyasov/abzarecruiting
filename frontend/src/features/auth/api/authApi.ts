import type { AuthResponse, LoginRequest, RegisterRequest } from '@entities/user'
import { API_BASE_URL } from '@shared/api'

type ApiErrorBody = {
  message?: string
  errors?: string[]
}

async function parseErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null

  if (body?.errors?.length) {
    return body.errors.join(' ')
  }

  if (body?.message) {
    return body.message
  }

  return response.statusText || 'Request failed'
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json() as Promise<AuthResponse>
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/Auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json() as Promise<AuthResponse>
}
