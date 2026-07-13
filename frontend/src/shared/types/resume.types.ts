export type ResumeCandidateAttributeDto = {
  name: string
  value: unknown
}

export type ResumeDto = {
  id: number
  candidateId: string
  positionId: number
  positionName: string
  published: boolean
  createdAt: string
  version: number
  candidateAttributes: ResumeCandidateAttributeDto[]
}

export type ResumeListItemDto = ResumeDto
