import type { ReactNode } from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import type { FileAttributeValue } from './attribute.types'

export type PagedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  size: number
}

export type SortDirection = 'asc' | 'desc'

export type PaginationParams = {
  page?: number
  size?: number
  search?: string
  sortBy?: string
  sortDir?: SortDirection
}

export type UserListParams = PaginationParams & {
  role?: string
  isLockedOut?: boolean
  emailConfirmed?: boolean
}

export type AttributeListParams = PaginationParams & {
  category?: string
  valueType?: string
  ids?: number[]
  searches?: string[]
}

export type TagListParams = PaginationParams & {
  ids?: number[]
  searches?: string[]
}

export type AbzaFieldType =
  | 'email'
  | 'password'
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'tel'
  | 'checkbox'
  | 'select'
  | 'period'
  | 'image'
  | 'file'
  | 'optionTags'
  | 'asyncEntityTags'
  | 'asyncEntitySelect'

export type AbzaValidationRule = {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  patternMessageKey?: string
}

export type AbzaSelectOption = {
  value: string
  label: string
  valueType?: string
  isNew?: boolean
}

export type AbzaFieldConfig = {
  name: string
  label: string
  type: AbzaFieldType
  validation?: AbzaValidationRule
  options?: AbzaSelectOption[]
  loadOptions?: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  allowCreateOptions?: boolean
  autoComplete?: string
  disabled?: boolean
  tooltip?: string
  deletable?: boolean
  size?: 'small' | 'medium'
  showWhen?: { field: string; value: string }
}

export type AbzaFormConfig = {
  fields: AbzaFieldConfig[]
  submitLabel?: string
}

export type AbzaFormValue =
  | string
  | string[]
  | AbzaSelectOption
  | AbzaSelectOption[]
  | FileAttributeValue
  | null

export type AbzaFormValues = Record<string, AbzaFormValue>

export type AbzaFormErrors = Record<string, string>

export type AbzaTableColumn<T> = {
  id: string
  label: string
  render: (row: T) => ReactNode
  width?: number | string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
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
  sortBy?: string
  sortDir?: SortDirection
  onSortChange?: (sortBy: string, sortDir: SortDirection) => void
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
  submitLabel?: string
  cancelLabel: string
}

export type AbzaModalProps = {
  open: boolean
  config: AbzaModalConfig
  onOpenChange: (open: boolean) => void
  onSubmit?: () => void | Promise<void>
  children: ReactNode
  isLoading?: boolean
  submitDisabled?: boolean
  hideSubmit?: boolean
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  secondaryLabel?: string
  onSecondary?: () => void | Promise<void>
}
