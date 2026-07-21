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
  const activeRef = useRef(false)
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

  const setActiveState = useCallback((active: boolean) => {
    if (activeRef.current === active) {
      return
    }

    activeRef.current = active
    setActiveRef.current?.(active)
  }, [])

  const flush = useCallback(async () => {
    clearTimer()

    if (!enabled || !autosaveEnabledRef.current || savingRef.current) {
      return
    }

    savingRef.current = true
    setIsSaving(true)
    setActiveState(true)

    try {
      await onFlushRef.current()
    } catch (flushError) {
      autosaveEnabledRef.current = false
      setAutosaveEnabled(false)
      setActiveState(false)
      onErrorRef.current?.(flushError)
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }, [clearTimer, enabled, setActiveState])

  const schedule = useCallback(() => {
    if (!enabled || !autosaveEnabledRef.current) {
      return
    }

    clearTimer()
    setActiveState(true)
    timerRef.current = window.setTimeout(() => {
      void flush()
    }, delayMs)
  }, [clearTimer, delayMs, enabled, flush, setActiveState])

  const reset = useCallback(
    (nextEnabled = enabled) => {
      clearTimer()
      setAutosaveEnabled(nextEnabled)
      autosaveEnabledRef.current = nextEnabled
      setActiveState(false)
    },
    [clearTimer, enabled, setActiveState],
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
      setActiveState(false)
    }
  }, [clearTimer, setActiveState])

  return {
    isSaving,
    autosaveEnabled,
    flush,
    schedule,
    reset,
    reenable,
    clearTimer,
    setActiveState,
    savingRef,
    autosaveEnabledRef,
  }
}
