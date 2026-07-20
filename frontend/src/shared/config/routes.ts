export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  confirmEmail: '/confirm-email',
  authCallback: '/auth/callback',
  attributes: '/attributes',
  tags: '/tags',
  positions: '/positions',
  positionDetail: '/position/:positionId',
  cvs: '/cvs',
  cvDetail: '/cvs/:id',
  projects: '/projects',
  users: '/users',
  profile: '/profile',
  profileDetail: '/profile/:candidateId',
} as const

export function profileDetailPath(candidateId: string) {
  return `/profile/${candidateId}`
}

export function cvDetailPath(id: number) {
  return `/cvs/${id}`
}

export function positionDetailPath(positionId: number) {
  return `/position/${positionId}`
}

export function withTagIdsQuery(path: string, tagIds: number | number[]): string {
  const ids = (Array.isArray(tagIds) ? tagIds : [tagIds]).filter((id) => Number.isFinite(id) && id > 0)
  if (ids.length === 0) {
    return path
  }

  const params = new URLSearchParams()
  for (const id of ids) {
    params.append('tagIds', String(id))
  }

  return `${path}?${params.toString()}`
}

export function parseTagIdsFromSearchParams(searchParams: URLSearchParams): number[] {
  return searchParams
    .getAll('tagIds')
    .map((value) => Number(value))
    .filter((id) => Number.isFinite(id) && id > 0)
}
