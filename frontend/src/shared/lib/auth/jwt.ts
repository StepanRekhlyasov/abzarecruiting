type JwtPayload = {
  sub?: string
  exp?: number
  role?: string | string[]
  [claim: string]: string | string[] | number | undefined
}

const legacyRoleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

export function getUserIdFromToken(token: string): string | null {
  try {
    const payload = parseJwtPayload(token)

    return payload?.sub ?? null
  } catch {
    return null
  }
}

export function getRolesFromToken(token: string): string[] {
  try {
    const payload = parseJwtPayload(token)

    if (!payload) {
      return []
    }

    const roleClaim = payload.role ?? payload[legacyRoleClaim]

    if (!roleClaim) {
      return []
    }

    return Array.isArray(roleClaim) ? roleClaim : [roleClaim]
  } catch {
    return []
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = parseJwtPayload(token)

    if (!payload?.exp) {
      return true
    }

    return payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function parseJwtPayload(token: string): JwtPayload | null {
  const payloadPart = token.split('.')[1]

  if (!payloadPart) {
    return null
  }

  return JSON.parse(atob(payloadPart)) as JwtPayload
}
