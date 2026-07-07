import type { ReactNode } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'

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

export type AbzaFieldType = 'email' | 'password' | 'text' | 'select'

export type AbzaValidationRule = {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  patternMessageKey?: string
}

export type AbzaSelectOption = {
  value: string
  label: string
}

export type AbzaFieldConfig = {
  name: string
  label: string
  type: AbzaFieldType
  validation?: AbzaValidationRule
  options?: AbzaSelectOption[]
  autoComplete?: string
  disabled?: boolean
}

export type AbzaFormConfig = {
  fields: AbzaFieldConfig[]
  submitLabel: string
}

export type AbzaFormValues = Record<string, string>

export type AbzaFormErrors = Record<string, string>

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

export type AbzaModalConfig = {
  title: string
  submitLabel: string
  cancelLabel: string
}

export type AbzaModalProps = {
  open: boolean
  config: AbzaModalConfig
  onClose: () => void
  onSubmit: () => void | Promise<void>
  children: ReactNode
  isSubmitting?: boolean
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}
