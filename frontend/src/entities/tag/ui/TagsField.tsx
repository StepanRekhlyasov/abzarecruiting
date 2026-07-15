import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SxProps, Theme } from '@mui/material/styles'
import type { AbzaSelectOption } from '@shared/types'
import { AsyncEntityTags } from '@shared/ui/inputs'
import { ensureTagByName, isNewTagOption, loadTagOptions } from '../lib/tagOptions'

export type TagsFieldProps = {
  label: string
  value: AbzaSelectOption[]
  onChange: (options: AbzaSelectOption[]) => void
  disabled?: boolean
  error?: boolean
  helperText?: string
  allowCreate?: boolean
  /** Persist new tags via API as soon as they are selected. Default: same as allowCreate. */
  createOnSelect?: boolean
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
  createOptionLabel?: (name: string) => string
  onCreateError?: (error: unknown) => void
}

export function TagsField({
  label,
  value,
  onChange,
  disabled,
  error,
  helperText,
  allowCreate = true,
  createOnSelect,
  size,
  sx,
  createOptionLabel,
  onCreateError,
}: TagsFieldProps) {
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)
  const shouldCreateOnSelect = createOnSelect ?? allowCreate

  const handleChange = async (nextOptions: AbzaSelectOption[]) => {
    if (!shouldCreateOnSelect || !nextOptions.some(isNewTagOption)) {
      onChange(nextOptions)
      return
    }

    setIsCreating(true)
    try {
      const resolved: AbzaSelectOption[] = []

      for (const option of nextOptions) {
        if (!isNewTagOption(option)) {
          resolved.push(option)
          continue
        }

        resolved.push(await ensureTagByName(option.label))
      }

      const unique = new Map<string, AbzaSelectOption>()
      for (const option of resolved) {
        unique.set(option.value, option)
      }

      onChange([...unique.values()])
    } catch (createError) {
      onCreateError?.(createError)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <AsyncEntityTags
      label={label}
      value={value}
      onChange={(options) => {
        void handleChange(options)
      }}
      loadOptions={loadTagOptions}
      disabled={disabled || isCreating}
      error={error}
      helperText={helperText}
      allowCreate={allowCreate}
      size={size}
      sx={sx}
      createOptionLabel={createOptionLabel ?? ((name) => t('form.createOption', { name }))}
    />
  )
}
