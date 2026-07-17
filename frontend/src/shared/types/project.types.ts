export type ProjectTagDto = {
  id: number
  name: string
}

export type ProjectDto = {
  id: number
  candidateId: string
  candidateName: string
  name: string
  description: string
  startAt: string
  endAt: string | null
  createdAt: string
  tags: ProjectTagDto[]
}

export type CreateProjectRequest = {
  candidateId?: string | null
  name: string
  description?: string
  startAt: string
  endAt?: string | null
}

export type UpdateProjectRequest = {
  name: string
  description?: string
  startAt: string
  endAt?: string | null
}
