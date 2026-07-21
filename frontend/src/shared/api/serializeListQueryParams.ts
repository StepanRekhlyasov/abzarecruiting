import type { PaginationParams } from '@shared/types'

type ListQueryParams = PaginationParams & {
  ids?: number[]
  searches?: string[]
  tagIds?: number[]
  candidateId?: string
  candidateIds?: string[]
  positionId?: number
  category?: string
  valueType?: string
}

export function serializeListQueryParams(params: ListQueryParams): string {
  const searchParams = new URLSearchParams()

  if (params.page != null) {
    searchParams.set('page', String(params.page))
  }
  if (params.size != null) {
    searchParams.set('size', String(params.size))
  }
  if (params.search) {
    searchParams.set('search', params.search)
  }
  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy)
  }
  if (params.sortDir) {
    searchParams.set('sortDir', params.sortDir)
  }
  if (params.category) {
    searchParams.set('category', params.category)
  }
  if (params.valueType) {
    searchParams.set('valueType', params.valueType)
  }
  if (params.candidateId) {
    searchParams.set('candidateId', params.candidateId)
  }
  if (params.positionId != null && Number.isFinite(params.positionId) && params.positionId > 0) {
    searchParams.set('positionId', String(params.positionId))
  }

  for (const id of params.ids ?? []) {
    searchParams.append('ids', String(id))
  }

  for (const id of params.tagIds ?? []) {
    if (id > 0) {
      searchParams.append('tagIds', String(id))
    }
  }

  for (const id of params.candidateIds ?? []) {
    if (id.trim()) {
      searchParams.append('candidateIds', id.trim())
    }
  }

  for (const term of params.searches ?? []) {
    if (term.trim()) {
      searchParams.append('searches', term.trim())
    }
  }

  return searchParams.toString()
}
