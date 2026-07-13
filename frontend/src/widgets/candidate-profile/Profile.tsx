import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { AbzaError } from '@features/abza-error'
import { CandidateProfileProvider, useCandidateProfile } from './model'
import { AttributeSection } from './parts/AttributeSection'

const AUTOSAVE_INTERVAL_MS = 5000

type ProfileProps = {
  candidateId: string
}

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

function ProfileContent() {
  const { t } = useTranslation()
  const {
    meAttributes,
    isLoading,
    error,
    actionError,
    setActionError,
    isAutosaveActive,
    setAutosaveActive,
    saveAttributeValue,
  } = useCandidateProfile()

  const [draftValues, setDraftValues] = useState<Record<number, string>>({})
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)

  const draftValuesRef = useRef(draftValues)
  const savedValuesRef = useRef<Record<number, string>>({})
  const versionsRef = useRef<Record<number, number>>({})
  const dirtyIdsRef = useRef(new Set<number>())
  const savingRef = useRef(false)
  const autosaveEnabledRef = useRef(true)

  const defaultAttributes = useMemo(
    () => meAttributes.filter((attribute) => attribute.isDefault),
    [meAttributes],
  )
  const addedAttributes = useMemo(
    () => meAttributes.filter((attribute) => !attribute.isDefault),
    [meAttributes],
  )

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
      setActionError(flushError instanceof Error ? flushError.message : 'error.profile.save')
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

  useEffect(() => {
    if (!error && !actionError) {
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error, actionError])

  const handleChange = (attributeId: number, value: string) => {
    draftValuesRef.current = { ...draftValuesRef.current, [attributeId]: value }
    setDraftValues(draftValuesRef.current)
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" component="h1">
          {t('profile.title')}
        </Typography>
        <SaveIcon
          aria-label="autosave"
          sx={{
            fontSize: 34,
            color: isAutosaveActive ? 'success.main' : 'text.disabled',
            opacity: isAutosaveActive ? 1 : 0.35,
            transition: 'color 0.2s ease, opacity 0.2s ease',
          }}
        />
      </Box>

      <AbzaError error={error} />
      <AbzaError error={actionError} onClose={() => setActionError(null)} />

      {!error ? (
        isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            <AttributeSection
              title={t('profile.meInfo.title')}
              mode="default"
              attributes={defaultAttributes}
              draftValues={draftValues}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <AttributeSection
              title={t('profile.addedAttributes.title')}
              mode="attrs"
              attributes={addedAttributes}
              draftValues={draftValues}
              onChange={handleChange}
              onBlur={handleBlur}
              emptyMessage={t('profile.addedAttributes.empty')}
            />
          </>
        )
      ) : null}
    </Box>
  )
}

export function Profile({ candidateId }: ProfileProps) {
  return (
    <CandidateProfileProvider candidateId={candidateId}>
      <ProfileContent />
    </CandidateProfileProvider>
  )
}
