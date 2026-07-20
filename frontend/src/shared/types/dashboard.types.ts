import type { PositionLevel, WorkFormat } from './position.types'

export type DashboardPositionDto = {
  id: number
  name: string
  company: string
  country: string
  level: PositionLevel
  format: WorkFormat
  createdAt: string
  resumesCount: number
  messagesCount: number
}

export type DashboardTagDto = {
  id: number
  name: string
  count: number
}

export type DashboardStatsDto = {
  cvsLast24Hours: number
  totalPositions: number
  totalCandidates: number
  totalRecruiters: number
  totalSubmittedCvs: number
}

export type DashboardDto = {
  latestPositions: DashboardPositionDto[]
  popularPositions: DashboardPositionDto[]
  discussedPositions: DashboardPositionDto[]
  positionsTagCloud: DashboardTagDto[]
  resumesTagCloud: DashboardTagDto[]
  stats: DashboardStatsDto
}
