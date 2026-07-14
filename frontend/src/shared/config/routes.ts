export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  confirmEmail: '/confirm-email',
  attributes: '/attributes',
  tags: '/tags',
  positions: '/positions',
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

export function homeRedirectPath(session: { roles: string[] } | null): string {
  if (!session) {
    return ROUTES.positions
  }

  if (session.roles.includes('Admin')) {
    return ROUTES.users
  }

  if (session.roles.includes('Recruiter')) {
    return ROUTES.cvs
  }

  if (session.roles.includes('Candidate')) {
    return ROUTES.profile
  }

  return ROUTES.positions
}
