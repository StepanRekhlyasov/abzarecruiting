import { useEffect, useMemo, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import type { AbzaSelectOption } from '@shared/types'

type AsyncEntitySelectProps = {
  label: string
  value: AbzaSelectOption | null
  onChange: (option: AbzaSelectOption | null) => void
  loadOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  disabled?: boolean
  error?: boolean
  helperText?: string
}

export function AsyncEntitySelect({
  label,
  value,
  onChange,
  loadOptions,
  disabled = false,
  error = false,
  helperText,
}: AsyncEntitySelectProps) {
  const [inputValue, setInputValue] = useState(value?.label ?? '')
  const [options, setOptions] = useState<AbzaSelectOption[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setInputValue(value?.label ?? '')
  }, [value?.value, value?.label])

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
    if (value) {
      map.set(value.value, value)
    }
    for (const option of options) {
      map.set(option.value, option)
    }
    return [...map.values()]
  }, [options, value])

  return (
    <Autocomplete
      options={mergedOptions}
      value={value}
      inputValue={inputValue}
      disabled={disabled}
      loading={isLoading}
      filterOptions={(current) => current}
      getOptionLabel={(option) => option.label || ''}
      isOptionEqualToValue={(option, selected) => option.value === selected.value}
      onInputChange={(_, nextInputValue, reason) => {
        if (reason === 'reset') {
          setInputValue(value?.label ?? nextInputValue)
          return
        }

        setInputValue(nextInputValue)
      }}
      onChange={(_, nextValue) => onChange(nextValue)}
      renderInput={(params) => (
        <TextField {...params} label={label} error={error} helperText={helperText} />
      )}
    />
  )
}
