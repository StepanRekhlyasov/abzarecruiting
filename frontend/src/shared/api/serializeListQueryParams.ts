import type { PaginationParams } from '@shared/types'

type ListQueryParams = PaginationParams & {
  ids?: number[]
  searches?: string[]
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

  for (const id of params.ids ?? []) {
    searchParams.append('ids', String(id))
  }

  for (const term of params.searches ?? []) {
    if (term.trim()) {
      searchParams.append('searches', term.trim())
    }
  }

  return searchParams.toString()
}
