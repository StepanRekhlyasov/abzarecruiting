import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import type { SxProps, Theme } from '@mui/material/styles'
import type { AbzaSelectOption } from '@shared/types'

const filter = createFilterOptions<AbzaSelectOption>()

export const NEW_TAG_VALUE_PREFIX = '__new__:'

type AsyncEntityTagsProps = {
  label: string
  value: AbzaSelectOption[]
  onChange: (options: AbzaSelectOption[]) => void
  loadOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  disabled?: boolean
  error?: boolean
  helperText?: string
  allowCreate?: boolean
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
  createOptionLabel?: (name: string) => string
}

function toOption(value: string | AbzaSelectOption): AbzaSelectOption {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return {
    value: `${NEW_TAG_VALUE_PREFIX}${trimmed}`,
    label: trimmed,
    isNew: true,
  }
}

export function AsyncEntityTags({
  label,
  value,
  onChange,
  loadOptions,
  disabled = false,
  error = false,
  helperText,
  allowCreate = false,
  size = 'medium',
  sx,
  createOptionLabel,
}: AsyncEntityTagsProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<AbzaSelectOption[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)

      try {
        const nextOptions = await loadOptions(inputValue.trim(), controller.signal)
        if (!controller.signal.aborted) {
          setOptions(nextOptions)
        }
      } catch {
        if (!controller.signal.aborted) {
          setOptions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [inputValue, loadOptions])

  const mergedOptions = useMemo(() => {
    const map = new Map<string, AbzaSelectOption>()
    for (const option of [...value, ...options]) {
      map.set(option.value, option)
    }
    return [...map.values()]
  }, [options, value])

  return (
    <Autocomplete
      multiple
      freeSolo={allowCreate}
      filterSelectedOptions
      options={mergedOptions}
      value={value}
      inputValue={inputValue}
      disabled={disabled}
      loading={isLoading}
      size={size}
      sx={{ width: '100%', ...sx }}
      filterOptions={(current, params) => {
        const filtered = allowCreate
          ? filter(current, params)
          : current

        const input = params.inputValue.trim()
        if (!allowCreate || !input) {
          return allowCreate ? filtered : current
        }

        const alreadyExists = [...filtered, ...value].some(
          (option) => option.label.toLowerCase() === input.toLowerCase(),
        )

        if (!alreadyExists) {
          filtered.push({
            value: `${NEW_TAG_VALUE_PREFIX}${input}`,
            label: input,
            isNew: true,
          })
        }

        return filtered
      }}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
      isOptionEqualToValue={(option, selected) => {
        if (typeof option === 'string' || typeof selected === 'string') {
          return false
        }
        return option.value === selected.value
      }}
      onInputChange={(_, nextInputValue, reason) => {
        if (reason !== 'reset') {
          setInputValue(nextInputValue)
        }
      }}
      onChange={(_, nextValue) => {
        const normalized = nextValue
          .map(toOption)
          .filter((option) => option.label.trim().length > 0)

        const unique = new Map<string, AbzaSelectOption>()
        for (const option of normalized) {
          unique.set(option.value, option)
        }

        onChange([...unique.values()])
      }}
      renderOption={(props, option) => {
        const item = typeof option === 'string' ? toOption(option) : option
        return (
          <li {...props} key={item.value}>
            {item.isNew
              ? (createOptionLabel?.(item.label) ?? t('form.createOption', { name: item.label }))
              : item.label}
          </li>
        )
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} size={size} error={error} helperText={helperText} />
      )}
    />
  )
}
