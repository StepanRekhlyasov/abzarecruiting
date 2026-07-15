import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import type { SxProps, Theme } from '@mui/material/styles'
import type { AbzaSelectOption } from '@shared/types'

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

function isSameLabel(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
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
      selectOnFocus={allowCreate}
      clearOnBlur={allowCreate}
      handleHomeEndKeys={allowCreate}
      filterSelectedOptions
      options={mergedOptions}
      value={value}
      inputValue={inputValue}
      disabled={disabled}
      loading={isLoading}
      size={size}
      sx={{ width: '100%', ...sx }}
      filterOptions={(current, params) => {
        const input = params.inputValue.trim()
        if (!allowCreate || !input) {
          return current
        }

        const alreadyExists = [...current, ...value].some((option) =>
          isSameLabel(option.label, input),
        )

        if (alreadyExists) {
          return current
        }

        return [
          ...current,
          {
            value: `${NEW_TAG_VALUE_PREFIX}${input}`,
            label: input,
            isNew: true,
          },
        ]
      }}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
      isOptionEqualToValue={(option, selected) => {
        if (typeof option === 'string' || typeof selected === 'string') {
          return isSameLabel(typeof option === 'string' ? option : option.label, typeof selected === 'string' ? selected : selected.label)
        }
        return option.value === selected.value
      }}
      onInputChange={(_, nextInputValue) => {
        setInputValue(nextInputValue)
      }}
      onChange={(_, nextValue) => {
        const normalized = nextValue
          .map(toOption)
          .filter((option) => option.label.trim().length > 0)

        const unique = new Map<string, AbzaSelectOption>()
        for (const option of normalized) {
          const key = option.isNew ? option.label.toLowerCase() : option.value
          unique.set(key, option)
        }

        onChange([...unique.values()])
        setInputValue('')
      }}
      renderOption={(props, option) => {
        const item = typeof option === 'string' ? toOption(option) : option
        const { key, ...rest } = props
        return (
          <li key={key ?? item.value} {...rest}>
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
