export type UserRole = 'Candidate' | 'Recruiter' | 'Admin'

export type AuthResponse = {
  accessToken: string
  expiresAt: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
}

export type SessionUser = {
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

export type User = {
  id: string
  name: string
}

export function getSessionDisplayName(user: SessionUser): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()

  return fullName || user.email
}
