import { createEffect, createEvent, createStore } from 'effector'
import type { AuthResponse, SessionUser } from '@shared/types'
import { getCurrentUser, isUnauthorizedError } from '../api/authApi'
import { getAccessToken, removeAccessToken, saveAccessToken } from '@shared/lib/auth/accessToken'
import { getUserIdFromToken, getRolesFromToken, isTokenExpired } from '@shared/lib/auth/jwt'
import { clearSession, getSession, saveSession } from '@shared/lib/auth/session'
import { notificationsSocket } from '@shared/lib/websocket'

export const sessionEstablished = createEvent<SessionUser>()
export const authSucceeded = createEvent<AuthResponse>()
export const logout = createEvent()
export const appStarted = createEvent()

function buildSessionUser(response: AuthResponse): SessionUser {
  const rolesFromToken = getRolesFromToken(response.accessToken)

  return {
    id: getUserIdFromToken(response.accessToken) ?? '',
    email: response.email,
    firstName: response.firstName,
    lastName: response.lastName,
    roles: rolesFromToken.length > 0 ? rolesFromToken : response.roles,
  }
}

function getInitialSession(): SessionUser | null {
  const token = getAccessToken()

  if (!token) {
    return null
  }

  const session = getSession()
  const rolesFromToken = getRolesFromToken(token)
  const userId = getUserIdFromToken(token) ?? ''

  if (!session) {
    if (!userId && rolesFromToken.length === 0) {
      return null
    }

    return {
      id: userId,
      email: '',
      firstName: '',
      lastName: '',
      roles: rolesFromToken,
    }
  }

  return {
    ...session,
    id: session.id || userId,
    roles: rolesFromToken.length > 0 ? rolesFromToken : session.roles,
  }
}

export const restoreSessionFx = createEffect(async (): Promise<SessionUser> => {
  const token = getAccessToken()

  if (!token) {
    throw new Error('NO_TOKEN')
  }

  if (isTokenExpired(token)) {
    throw new Error('TOKEN_EXPIRED')
  }

  return getCurrentUser()
})

export const $session = createStore<SessionUser | null>(getInitialSession())
  .on(sessionEstablished, (_, user) => user)
  .on(logout, () => null)

$session.watch((session) => {
  if (session) {
    notificationsSocket.connect()
    return
  }

  notificationsSocket.disconnect()
})

authSucceeded.watch((response) => {
  saveAccessToken(response.accessToken)
  const user = buildSessionUser(response)
  saveSession(user)
  sessionEstablished(user)
})

logout.watch(() => {
  removeAccessToken()
  clearSession()
})

restoreSessionFx.done.watch(({ result }) => {
  saveSession(result)
  sessionEstablished(result)
})

restoreSessionFx.fail.watch(({ error }) => {
  const shouldLogout =
    (error instanceof Error && (error.message === 'NO_TOKEN' || error.message === 'TOKEN_EXPIRED')) ||
    isUnauthorizedError(error)

  if (shouldLogout) {
    logout()
  }
})

appStarted.watch(() => {
  const token = getAccessToken()

  if (!token) {
    if (getSession()) {
      logout()
    }
    return
  }

  if (restoreSessionFx.pending.getState()) {
    return
  }

  void restoreSessionFx()
})
