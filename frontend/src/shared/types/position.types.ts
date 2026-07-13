export const POSITION_LEVELS = ['Junior', 'Middle', 'Senior'] as const
export type PositionLevel = (typeof POSITION_LEVELS)[number]

export const WORK_FORMATS = ['Office', 'Remote', 'Hybrid'] as const
export type WorkFormat = (typeof WORK_FORMATS)[number]

export type PositionAttributeDto = {
  attributeId: number
  name: string
  isKey: boolean
}

export type PositionTagDto = {
  tagId: number
  name: string
  isKey: boolean
}

export type PositionDto = {
  id: number
  name: string
  description: string
  company: string
  country: string
  level: PositionLevel
  format: WorkFormat
  maxProjects: number
  createdAt: string
  version: number
  attributes: PositionAttributeDto[]
  tags: PositionTagDto[]
}

export type CreatePositionRequest = {
  name: string
  description?: string
  company?: string
  country?: string
  level?: PositionLevel | null
  format?: WorkFormat | null
  maxProjects?: number
}

export type UpdatePositionRequest = CreatePositionRequest & {
  version: number
}
