export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  attributes: '/attributes',
  profile: '/profile',
  profileDetail: '/profile/:candidateId',
} as const

export function profileDetailPath(candidateId: string) {
  return `/profile/${candidateId}`
}
