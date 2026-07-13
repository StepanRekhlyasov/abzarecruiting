export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  attributes: '/attributes',
  tags: '/tags',
  positions: '/positions',
  cvs: '/cvs',
  projects: '/projects',
  profile: '/profile',
  profileDetail: '/profile/:candidateId',
} as const

export function profileDetailPath(candidateId: string) {
  return `/profile/${candidateId}`
}
