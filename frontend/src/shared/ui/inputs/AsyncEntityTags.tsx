import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
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
      filterSelectedOptions
      options={mergedOptions}
      value={value}
      inputValue={inputValue}
      disabled={disabled}
      loading={isLoading}
      style={{ width: '100%' }}
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
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selected) => option.value === selected.value}
      onInputChange={(_, nextInputValue, reason) => {
        if (reason !== 'reset') {
          setInputValue(nextInputValue)
        }
      }}
      onChange={(_, nextValue) => onChange(nextValue)}
      renderOption={(props, option) => (
        <li {...props} key={option.value}>
          {option.isNew ? t('form.createOption', { name: option.label }) : option.label}
        </li>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} error={error} helperText={helperText} />
      )}
    />
  )
}
