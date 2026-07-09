import type { SessionUser } from '@shared/types'

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

export function isAdmin(user: SessionUser | null): boolean {
  return user?.roles.includes('Admin') ?? false
}
