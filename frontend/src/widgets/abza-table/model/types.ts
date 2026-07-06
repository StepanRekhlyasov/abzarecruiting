import type { ReactNode } from 'react'

export type AbzaTableColumn<T> = {
  id: string
  label: string
  render: (row: T) => ReactNode
  width?: number | string
}

export type AbzaTableRowId = string | number

export type AbzaTableProps<T> = {
  columns: AbzaTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => AbzaTableRowId
  toolbar?: ReactNode
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  selectable?: boolean
  selectedIds?: AbzaTableRowId[]
  onSelectionChange?: (selectedIds: AbzaTableRowId[]) => void
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyMessage?: string
  loadingMessage?: string
}
