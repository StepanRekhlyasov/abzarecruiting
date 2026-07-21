import { useCallback, useEffect, useRef, useState } from 'react'
import {
  toComparableAttributeValue,
  type AttributeDraftValue,
  type ProfileAttributeDto,
} from '@shared/types'
import { parseApiFieldErrors } from '@shared/lib/errors'
import {
  getDirtyAttributeIds,
  toAttributeDraftMap,
  toAttributeVersionMap,
} from './attributeDraft'
import { useAutosave } from './useAutosave'

export type AttributeAutosaveItem = {
  attributeId: number
  value: AttributeDraftValue
  version: number
}

type UseAttributeAutosaveOptions = {
  attributes: ProfileAttributeDto[]
  canEdit: boolean
  isLoading: boolean
  saveAttributeValues: (items: AttributeAutosaveItem[]) => Promise<Record<number, number>>
  setActionError: (error: string | null) => void
  setAutosaveActive: (active: boolean) => void
  errorKey?: string
  flushOnUnmount?: boolean
}

export function useAttributeAutosave({
  attributes,
  canEdit,
  isLoading,
  saveAttributeValues,
  setActionError,
  setAutosaveActive,
  errorKey = 'error.profile.save',
  flushOnUnmount,
}: UseAttributeAutosaveOptions) {
  const shouldFlushOnUnmount = flushOnUnmount ?? canEdit

  const [isDirty, setIsDirty] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [, bumpDraftRevision] = useState(0)
  const draftRef = useRef<Record<number, AttributeDraftValue>>({})
  const savedRef = useRef<Record<number, AttributeDraftValue>>({})
  const versionsRef = useRef<Record<number, number>>({})

  const syncDirtyState = useCallback(() => {
    const dirty = getDirtyAttributeIds(draftRef.current, savedRef.current).length > 0
    setIsDirty((current) => (current === dirty ? current : dirty))
  }, [])

  const setActiveStateRef = useRef(setAutosaveActive)
  setActiveStateRef.current = setAutosaveActive

  const onFlush = useCallback(async () => {
    const ids = getDirtyAttributeIds(draftRef.current, savedRef.current)
    if (ids.length === 0) {
      setActiveStateRef.current(false)
      return
    }

    const items: AttributeAutosaveItem[] = []
    for (const attributeId of ids) {
      const value = draftRef.current[attributeId] ?? ''
      const saved = savedRef.current[attributeId] ?? ''

      if (toComparableAttributeValue(value) === toComparableAttributeValue(saved)) {
        continue
      }

      items.push({
        attributeId,
        value,
        version: versionsRef.current[attributeId] ?? 0,
      })
    }

    if (items.length === 0) {
      setActiveStateRef.current(false)
      return
    }

    const nextVersions = await saveAttributeValues(items)
    for (const item of items) {
      savedRef.current[item.attributeId] = item.value
      const nextVersion = nextVersions[item.attributeId]
      if (typeof nextVersion === 'number') {
        versionsRef.current[item.attributeId] = nextVersion
      }
    }

    setFieldErrors({})
    syncDirtyState()
    const stillDirty = getDirtyAttributeIds(draftRef.current, savedRef.current).length > 0
    setActiveStateRef.current(stillDirty)
  }, [saveAttributeValues, syncDirtyState])

  const {
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
  } = useAutosave({
    enabled: canEdit,
    onFlush,
    setActive: setAutosaveActive,
    onError: (flushError) => {
      const nextFieldErrors = parseApiFieldErrors(flushError)
      if (nextFieldErrors) {
        setFieldErrors(nextFieldErrors)
      }

      setActionError(flushError instanceof Error ? flushError.message : errorKey)
    },
  })

  setActiveStateRef.current = setActiveState

  useEffect(() => {
    if (isLoading) {
      return
    }

    const next = toAttributeDraftMap(attributes)
    draftRef.current = next
    savedRef.current = { ...next }
    versionsRef.current = toAttributeVersionMap(attributes)
    setFieldErrors({})
    setActionError(null)
    setIsDirty(false)
    reset(canEdit)
  }, [attributes, canEdit, isLoading, reset, setActionError])

  useEffect(() => {
    return () => {
      if (!shouldFlushOnUnmount || !autosaveEnabledRef.current || savingRef.current) {
        return
      }

      const ids = getDirtyAttributeIds(draftRef.current, savedRef.current)
      const items: AttributeAutosaveItem[] = ids.map((attributeId) => ({
        attributeId,
        value: draftRef.current[attributeId] ?? '',
        version: versionsRef.current[attributeId] ?? 0,
      }))

      if (items.length > 0) {
        void saveAttributeValues(items)
      }
    }
  }, [autosaveEnabledRef, saveAttributeValues, savingRef, shouldFlushOnUnmount])

  const getDraftSnapshot = useCallback(() => draftRef.current, [])

  const handleChange = useCallback(
    (attributeId: number, value: AttributeDraftValue) => {
      if (!canEdit) {
        return
      }

      draftRef.current = { ...draftRef.current, [attributeId]: value }
      syncDirtyState()
      bumpDraftRevision((revision) => revision + 1)

      reenable()
      setFieldErrors((current) => {
        if (!current[String(attributeId)]) {
          return current
        }

        const next = { ...current }
        delete next[String(attributeId)]
        return next
      })
      setActionError(null)
      schedule()
    },
    [canEdit, reenable, schedule, setActionError, syncDirtyState],
  )

  const handleManualSave = useCallback(() => {
    if (!isDirty && !isSaving) {
      return
    }

    void flush()
  }, [flush, isDirty, isSaving])

  const canSave = autosaveEnabled && (isDirty || isSaving)

  return {
    fieldErrors,
    isDirty,
    isSaving,
    canSave,
    getDraftSnapshot,
    handleChange,
    handleManualSave,
    flush,
    clearTimer,
  }
}
