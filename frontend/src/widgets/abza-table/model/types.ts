import type { ReactNode } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'

export type AbzaTableColumn<T> = {
  id: string
  label: string
  render: (row: T) => ReactNode
  width?: number | string
  align?: 'left' | 'center' | 'right'
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
  getRowSx?: (row: T) => SxProps<Theme> | undefined
  loading?: boolean
  emptyMessage?: string
  loadingMessage?: string
}
