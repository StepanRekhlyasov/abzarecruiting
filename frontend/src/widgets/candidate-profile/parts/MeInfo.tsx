import { useCallback, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { InputProvider } from '@features/attribute'
import { useCandidateProfile } from '../model'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

const AUTOSAVE_INTERVAL_MS = 5000

function toDraftMap(attributes: { id: number; value: string | null }[]) {
  return Object.fromEntries(attributes.map((attribute) => [attribute.id, attribute.value ?? '']))
}

function toVersionMap(attributes: { id: number; version: number }[]) {
  return Object.fromEntries(attributes.map((attribute) => [attribute.id, attribute.version]))
}

function hasPendingDirty(
  dirtyIds: Set<number>,
  draftValues: Record<number, string>,
  savedValues: Record<number, string>,
) {
  for (const attributeId of dirtyIds) {
    if ((draftValues[attributeId] ?? '') !== (savedValues[attributeId] ?? '')) {
      return true
    }
  }

  return false
}

export function MeInfo() {
  const {
    meAttributes,
    isLoading,
    saveAttributeValue,
    setActionError,
    setAutosaveActive,
  } = useCandidateProfile()
  const [draftValues, setDraftValues] = useState<Record<number, string>>({})
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const { t } = useTranslation()
  
  const draftValuesRef = useRef(draftValues)
  const savedValuesRef = useRef<Record<number, string>>({})
  const versionsRef = useRef<Record<number, number>>({})
  const dirtyIdsRef = useRef(new Set<number>())
  const savingRef = useRef(false)
  const autosaveEnabledRef = useRef(true)

  const syncAutosaveActive = useCallback(() => {
    const pending =
      autosaveEnabledRef.current &&
      (savingRef.current ||
        hasPendingDirty(dirtyIdsRef.current, draftValuesRef.current, savedValuesRef.current))
    setAutosaveActive(pending)
  }, [setAutosaveActive])

  useEffect(() => {
    draftValuesRef.current = draftValues
  }, [draftValues])

  useEffect(() => {
    autosaveEnabledRef.current = autosaveEnabled
  }, [autosaveEnabled])

  useEffect(() => {
    if (isLoading) {
      return
    }

    const next = toDraftMap(meAttributes)
    setDraftValues(next)
    savedValuesRef.current = { ...next }
    versionsRef.current = toVersionMap(meAttributes)
    dirtyIdsRef.current = new Set()
    setAutosaveEnabled(true)
    setActionError(null)
    setAutosaveActive(false)
  }, [meAttributes, isLoading, setActionError, setAutosaveActive])

  const flushDirty = useCallback(async () => {
    if (!autosaveEnabledRef.current || savingRef.current || dirtyIdsRef.current.size === 0) {
      return
    }

    savingRef.current = true
    setAutosaveActive(true)

    const ids = [...dirtyIdsRef.current]

    try {
      for (const attributeId of ids) {
        if (!autosaveEnabledRef.current) {
          break
        }

        const value = draftValuesRef.current[attributeId] ?? ''
        const saved = savedValuesRef.current[attributeId] ?? ''

        if (value === saved) {
          dirtyIdsRef.current.delete(attributeId)
          continue
        }

        const version = versionsRef.current[attributeId] ?? 0
        const nextVersion = await saveAttributeValue(attributeId, value, version)
        savedValuesRef.current[attributeId] = value
        versionsRef.current[attributeId] = nextVersion
        dirtyIdsRef.current.delete(attributeId)
      }
    } catch (flushError) {
      autosaveEnabledRef.current = false
      setAutosaveEnabled(false)
      setActionError(
        flushError instanceof Error ? flushError.message : 'error.profile.save',
      )
    } finally {
      savingRef.current = false
      syncAutosaveActive()
    }
  }, [saveAttributeValue, setActionError, setAutosaveActive, syncAutosaveActive])

  useEffect(() => {
    if (!autosaveEnabled) {
      setAutosaveActive(false)
      return
    }

    const timer = window.setInterval(() => {
      void flushDirty()
    }, AUTOSAVE_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [flushDirty, autosaveEnabled, setAutosaveActive])

  useEffect(() => {
    return () => {
      setAutosaveActive(false)

      if (!autosaveEnabledRef.current || dirtyIdsRef.current.size === 0) {
        return
      }

      const ids = [...dirtyIdsRef.current]
      for (const attributeId of ids) {
        const value = draftValuesRef.current[attributeId] ?? ''
        const saved = savedValuesRef.current[attributeId] ?? ''
        if (value === saved) {
          continue
        }

        const version = versionsRef.current[attributeId] ?? 0
        void saveAttributeValue(attributeId, value, version)
      }
    }
  }, [saveAttributeValue, setAutosaveActive])

  const handleChange = (attributeId: number, value: string) => {
    setDraftValues((prev) => ({ ...prev, [attributeId]: value }))
    dirtyIdsRef.current.add(attributeId)

    if (!autosaveEnabledRef.current) {
      autosaveEnabledRef.current = true
      setAutosaveEnabled(true)
      setActionError(null)
    }

    setAutosaveActive(true)
  }

  const handleBlur = (attributeId: number) => {
    if (!autosaveEnabled || !dirtyIdsRef.current.has(attributeId)) {
      return
    }

    void flushDirty()
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  return (
    <>
        <Typography variant="h5" component="h4">
            {t('profile.meInfo.title')}
        </Typography> 
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {meAttributes.map((attribute) => (
            <InputProvider
              key={attribute.id}
              attribute={attribute}
              value={draftValues[attribute.id] ?? ''}
              onChange={(value) => handleChange(attribute.id, value)}
              onBlur={() => handleBlur(attribute.id)}
              editable
              deletable={false}
              tooltip={attribute.description}
            />
          ))}
        </Box>
    </>
  )
}
