import type { ReactNode } from 'react'
import type {
  AbzaSelectOption,
  AsyncEntityLoadOptions,
} from '@shared/types'

export type AbzaTableToolbarAction = {
  onClick: () => void
  disabled?: boolean
  title?: string
  'aria-label'?: string
}

export type AbzaTableToolbarTextSearch = {
  label: string
  onSearch: (value: string) => void
}

export type AbzaTableToolbarTagsSearch = {
  label: string
  value: AbzaSelectOption[]
  onChange: (options: AbzaSelectOption[]) => void
  allowCreate?: boolean
  createOnSelect?: boolean
  createOptionLabel?: (name: string) => string
}

export type AbzaTableToolbarAsyncTagsSearch = {
  label: string
  value: AbzaSelectOption[]
  onChange: (options: AbzaSelectOption[]) => void
  loadOptions: AsyncEntityLoadOptions
  allowCreate?: boolean
  createOptionLabel?: (name: string) => string
}

export type AbzaTableToolbarFilter = {
  active: boolean
  onClick: () => void
  'aria-label': string
}

export type AbzaTableToolbarProps = {
  disabled?: boolean
  textSearch?: AbzaTableToolbarTextSearch
  tagsSearch?: AbzaTableToolbarTagsSearch
  asyncTagsSearch?: AbzaTableToolbarAsyncTagsSearch
  filter?: AbzaTableToolbarFilter
  create?: AbzaTableToolbarAction
  delete?: AbzaTableToolbarAction
  duplicate?: AbzaTableToolbarAction
  changeRole?: AbzaTableToolbarAction
  link?: AbzaTableToolbarAction
  unlink?: AbzaTableToolbarAction
  createResumes?: AbzaTableToolbarAction & { label: string }
  children?: ReactNode
}
