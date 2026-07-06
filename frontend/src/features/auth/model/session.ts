import { createEvent, createStore } from 'effector'
import type { AuthResponse, SessionUser } from '@entities/user'
import { getAccessToken, removeAccessToken, saveAccessToken } from '@shared/lib/auth/accessToken'
import { clearSession, getSession, saveSession } from '@shared/lib/auth/session'

export const sessionEstablished = createEvent<SessionUser>()
export const authSucceeded = createEvent<AuthResponse>()
export const logout = createEvent()

function getInitialSession(): SessionUser | null {
  if (!getAccessToken()) {
    return null
  }

  return getSession()
}

export const $session = createStore<SessionUser | null>(getInitialSession())
  .on(sessionEstablished, (_, user) => user)
  .on(logout, () => null)

authSucceeded.watch((response) => {
  saveAccessToken(response.accessToken)
  saveSession({
    email: response.email,
    firstName: response.firstName,
    lastName: response.lastName,
    roles: response.roles,
  })
  sessionEstablished({
    email: response.email,
    firstName: response.firstName,
    lastName: response.lastName,
    roles: response.roles,
  })
})

logout.watch(() => {
  removeAccessToken()
  clearSession()
})
