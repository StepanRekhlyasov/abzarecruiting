import type { ProfileAttributeDto } from './profile.types'
import type { ProjectDto } from './project.types'

export type ResumeCandidateAttributeDto = {
  name: string
  value: unknown
}

export type ResumeDto = {
  id: number
  candidateId: string
  candidateName: string
  positionId: number
  positionName: string
  maxProjects: number
  published: boolean
  createdAt: string
  version: number
  likesCount: number
  likedByCurrentUser: boolean
  candidateAttributes: ResumeCandidateAttributeDto[]
  attributes: ProfileAttributeDto[]
  projects: ProjectDto[]
}

export type ResumeListItemDto = ResumeDto

export type ResumeLikeStateDto = {
  likesCount: number
  likedByCurrentUser: boolean
}

export type CreateResumeRequest = {
  positionId: number
  candidateId?: string | null
}

export type UpdateResumeRequest = {
  published: boolean
  version: number
}
