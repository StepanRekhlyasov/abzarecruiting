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
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

export type CurrentUserResponse = SessionUser

export type User = {
  id: string
  name: string
}

export function getSessionDisplayName(user: SessionUser): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()

  return fullName || user.email
}

export function isRecruiterOrAdmin(user: SessionUser | null): boolean {
  return user?.roles.some((role) => role === 'Recruiter' || role === 'Admin') ?? false
}

export function isCandidate(user: SessionUser | null): boolean {
  return user?.roles.includes('Candidate') ?? false
}
