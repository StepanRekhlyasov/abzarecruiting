export type PagedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  size: number
}

export type PaginationParams = {
  page?: number
  size?: number
  search?: string
}
