import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import type { SxProps, Theme } from '@mui/material/styles'
import type {
  AbzaSelectOption,
  AsyncEntityLoadOptions,
  AsyncEntityOptionsPage,
} from '@shared/types'

export const NEW_TAG_VALUE_PREFIX = '__new__:'
export const ASYNC_ENTITY_TAGS_PAGE_SIZE = 20

export type { AsyncEntityLoadOptions, AsyncEntityOptionsPage }

type AsyncEntityTagsProps = {
  label: string
  value: AbzaSelectOption[]
  onChange: (options: AbzaSelectOption[]) => void
  loadOptions: AsyncEntityLoadOptions
  disabled?: boolean
  error?: boolean
  helperText?: string
  allowCreate?: boolean
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
  createOptionLabel?: (name: string) => string
  onBlur?: () => void
  pageSize?: number
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

function mergeUniqueOptions(
  current: AbzaSelectOption[],
  incoming: AbzaSelectOption[],
): AbzaSelectOption[] {
  const map = new Map<string, AbzaSelectOption>()
  for (const option of [...current, ...incoming]) {
    map.set(option.value, option)
  }
  return [...map.values()]
}

function normalizeLoadResult(
  result: AbzaSelectOption[] | AsyncEntityOptionsPage,
  pageSize: number,
): AsyncEntityOptionsPage {
  if (Array.isArray(result)) {
    return {
      options: result,
      hasMore: result.length >= pageSize,
    }
  }

  return result
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
  onBlur,
  pageSize = ASYNC_ENTITY_TAGS_PAGE_SIZE,
}: AsyncEntityTagsProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<AbzaSelectOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const isLoadingMoreRef = useRef(false)
  const inputValueRef = useRef(inputValue)
  const loadMoreControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    inputValueRef.current = inputValue
  }, [inputValue])

  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  useEffect(() => {
    const controller = new AbortController()
    loadMoreControllerRef.current?.abort()
    loadMoreControllerRef.current = null
    isLoadingMoreRef.current = false

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      setIsLoadingMore(false)
      pageRef.current = 1
      hasMoreRef.current = true
      setHasMore(true)

      try {
        const nextOptions = await loadOptions(inputValue.trim(), controller.signal, 1)
        if (!controller.signal.aborted) {
          const page = normalizeLoadResult(nextOptions, pageSize)
          setOptions(page.options)
          hasMoreRef.current = page.hasMore
          setHasMore(page.hasMore)
        }
      } catch {
        if (!controller.signal.aborted) {
          setOptions([])
          hasMoreRef.current = false
          setHasMore(false)
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
  }, [inputValue, loadOptions, pageSize])

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreRef.current) {
      return
    }

    isLoadingMoreRef.current = true
    setIsLoadingMore(true)

    const controller = new AbortController()
    loadMoreControllerRef.current?.abort()
    loadMoreControllerRef.current = controller

    const nextPage = pageRef.current + 1

    try {
      const nextOptions = await loadOptions(
        inputValueRef.current.trim(),
        controller.signal,
        nextPage,
      )

      if (controller.signal.aborted) {
        return
      }

      const page = normalizeLoadResult(nextOptions, pageSize)
      pageRef.current = nextPage
      setOptions((current) => mergeUniqueOptions(current, page.options))
      hasMoreRef.current = page.hasMore
      setHasMore(page.hasMore)
    } catch {
      if (!controller.signal.aborted) {
        hasMoreRef.current = false
        setHasMore(false)
      }
    } finally {
      if (!controller.signal.aborted) {
        isLoadingMoreRef.current = false
        setIsLoadingMore(false)
      }
    }
  }, [loadOptions, pageSize])

  const handleListboxScroll = useCallback(
    (event: UIEvent<HTMLUListElement>) => {
      const listbox = event.currentTarget
      const distanceToBottom = listbox.scrollHeight - listbox.scrollTop - listbox.clientHeight

      if (distanceToBottom <= 48) {
        void loadMore()
      }
    },
    [loadMore],
  )

  const mergedOptions = useMemo(() => mergeUniqueOptions(value, options), [options, value])

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
      loading={isLoading || isLoadingMore}
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
          return isSameLabel(
            typeof option === 'string' ? option : option.label,
            typeof selected === 'string' ? selected : selected.label,
          )
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
      onBlur={onBlur}
      slotProps={{
        listbox: {
          onScroll: handleListboxScroll,
          style: { maxHeight: 280 },
        },
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
