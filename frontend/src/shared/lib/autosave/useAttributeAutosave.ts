import { useCallback, useEffect, useRef, useState } from 'react'
import {
  toComparableAttributeValue,
  type AttributeDraftValue,
  type ProfileAttributeDto,
} from '@shared/types'
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

  const [draft, setDraft] = useState<Record<number, AttributeDraftValue>>({})
  const draftRef = useRef(draft)
  const savedRef = useRef<Record<number, AttributeDraftValue>>({})
  const versionsRef = useRef<Record<number, number>>({})

  const dirtyIds = getDirtyAttributeIds(draft, savedRef.current)
  const isDirty = dirtyIds.length > 0

  const onFlush = useCallback(async () => {
    const ids = getDirtyAttributeIds(draftRef.current, savedRef.current)
    if (ids.length === 0) {
      setAutosaveActive(false)
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
      setAutosaveActive(false)
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

    const stillDirty = getDirtyAttributeIds(draftRef.current, savedRef.current).length > 0
    setAutosaveActive(stillDirty)
  }, [saveAttributeValues, setAutosaveActive])

  const {
    isSaving,
    autosaveEnabled,
    flush,
    schedule,
    reset,
    reenable,
    clearTimer,
    savingRef,
    autosaveEnabledRef,
  } = useAutosave({
    enabled: canEdit,
    onFlush,
    setActive: setAutosaveActive,
    onError: (flushError) => {
      setActionError(flushError instanceof Error ? flushError.message : errorKey)
    },
  })

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    if (isLoading) {
      return
    }

    const next = toAttributeDraftMap(attributes)
    draftRef.current = next
    setDraft(next)
    savedRef.current = { ...next }
    versionsRef.current = toAttributeVersionMap(attributes)
    setActionError(null)
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

  const handleChange = useCallback(
    (attributeId: number, value: AttributeDraftValue) => {
      if (!canEdit) {
        return
      }

      const next = { ...draftRef.current, [attributeId]: value }
      draftRef.current = next
      setDraft(next)

      reenable()
      setActionError(null)
      schedule()
    },
    [canEdit, reenable, schedule, setActionError],
  )

  const handleManualSave = useCallback(() => {
    if (!isDirty && !isSaving) {
      return
    }

    void flush()
  }, [flush, isDirty, isSaving])

  const canSave = autosaveEnabled && (isDirty || isSaving)

  return {
    draft,
    isDirty,
    isSaving,
    canSave,
    handleChange,
    handleManualSave,
    flush,
    clearTimer,
  }
}
