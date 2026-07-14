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
  frontendBaseUrl: string
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

export type UserListItem = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole | string
  emailConfirmed: boolean
  isLockedOut: boolean
  createdAt: string
}

export type CreateUserRequest = {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
}

export type ChangeUsersRoleBatchRequest = {
  userIds: string[]
  role: UserRole
}

export type DeleteUsersRequest = {
  userIds: string[]
}

export type RegisterResultResponse = {
  message: string
}

export type ConfirmEmailRequest = {
  userId: string
  token: string
}
