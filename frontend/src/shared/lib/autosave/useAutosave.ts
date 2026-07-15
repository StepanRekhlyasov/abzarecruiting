import { useCallback, useEffect, useRef, useState } from 'react'
import { AUTOSAVE_DELAY_MS } from './attributeDraft'

type UseAutosaveOptions = {
  enabled: boolean
  delayMs?: number
  onFlush: () => Promise<void>
  onError?: (error: unknown) => void
  setActive?: (active: boolean) => void
}

export function useAutosave({
  enabled,
  delayMs = AUTOSAVE_DELAY_MS,
  onFlush,
  onError,
  setActive,
}: UseAutosaveOptions) {
  const [isSaving, setIsSaving] = useState(false)
  const [autosaveEnabled, setAutosaveEnabled] = useState(enabled)

  const timerRef = useRef<number | null>(null)
  const autosaveEnabledRef = useRef(enabled)
  const savingRef = useRef(false)
  const onFlushRef = useRef(onFlush)
  const onErrorRef = useRef(onError)
  const setActiveRef = useRef(setActive)

  onFlushRef.current = onFlush
  onErrorRef.current = onError
  setActiveRef.current = setActive

  useEffect(() => {
    autosaveEnabledRef.current = autosaveEnabled
  }, [autosaveEnabled])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const flush = useCallback(async () => {
    clearTimer()

    if (!enabled || !autosaveEnabledRef.current || savingRef.current) {
      return
    }

    savingRef.current = true
    setIsSaving(true)
    setActiveRef.current?.(true)

    try {
      await onFlushRef.current()
    } catch (flushError) {
      autosaveEnabledRef.current = false
      setAutosaveEnabled(false)
      setActiveRef.current?.(false)
      onErrorRef.current?.(flushError)
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }, [clearTimer, enabled])

  const schedule = useCallback(() => {
    if (!enabled || !autosaveEnabledRef.current) {
      return
    }

    clearTimer()
    setActiveRef.current?.(true)
    timerRef.current = window.setTimeout(() => {
      void flush()
    }, delayMs)
  }, [clearTimer, delayMs, enabled, flush])

  const reset = useCallback(
    (nextEnabled = enabled) => {
      clearTimer()
      setAutosaveEnabled(nextEnabled)
      autosaveEnabledRef.current = nextEnabled
      setActiveRef.current?.(false)
    },
    [clearTimer, enabled],
  )

  const reenable = useCallback(() => {
    if (!autosaveEnabledRef.current) {
      autosaveEnabledRef.current = true
      setAutosaveEnabled(true)
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      setActiveRef.current?.(false)
    }
  }, [clearTimer])

  return {
    isSaving,
    autosaveEnabled,
    flush,
    schedule,
    reset,
    reenable,
    clearTimer,
    savingRef,
    autosaveEnabledRef,
  }
}
