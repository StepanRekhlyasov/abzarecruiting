import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { AbzaError } from '@features/abza-error'
import {
  toComparableAttributeValue,
  type AttributeDraftValue,
  type ProfileAttributeDto,
} from '@shared/types'
import { CandidateProfileProvider, useCandidateProfile } from './model'
import { AttributeSection } from './parts/AttributeSection'

const AUTOSAVE_DELAY_MS = 5000

type ProfileProps = {
  candidateId: string
}

function toDraftMap(attributes: ProfileAttributeDto[]) {
  return Object.fromEntries(
    attributes.map((attribute) => [attribute.id, (attribute.value ?? '') as AttributeDraftValue]),
  )
}

function toVersionMap(attributes: { id: number; version: number }[]) {
  return Object.fromEntries(attributes.map((attribute) => [attribute.id, attribute.version]))
}

function getDirtyIds(
  draft: Record<number, AttributeDraftValue>,
  saved: Record<number, AttributeDraftValue>,
) {
  return Object.keys(draft)
    .map(Number)
    .filter(
      (attributeId) =>
        toComparableAttributeValue(draft[attributeId]) !==
        toComparableAttributeValue(saved[attributeId]),
    )
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

  const [draft, setDraft] = useState<Record<number, AttributeDraftValue>>({})
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const draftRef = useRef(draft)
  const savedRef = useRef<Record<number, AttributeDraftValue>>({})
  const versionsRef = useRef<Record<number, number>>({})
  const timerRef = useRef<number | null>(null)
  const autosaveEnabledRef = useRef(true)
  const savingRef = useRef(false)

  const defaultAttributes = useMemo(
    () => meAttributes.filter((attribute) => attribute.isDefault),
    [meAttributes],
  )
  const addedAttributes = useMemo(
    () => meAttributes.filter((attribute) => !attribute.isDefault),
    [meAttributes],
  )

  const dirtyIds = getDirtyIds(draft, savedRef.current)
  const isDirty = dirtyIds.length > 0

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const flush = useCallback(async () => {
    clearTimer()

    if (!autosaveEnabledRef.current || savingRef.current) {
      return
    }

    const ids = getDirtyIds(draftRef.current, savedRef.current)
    if (ids.length === 0) {
      setAutosaveActive(false)
      return
    }

    savingRef.current = true
    setIsSaving(true)
    setAutosaveActive(true)

    try {
      for (const attributeId of ids) {
        if (!autosaveEnabledRef.current) {
          break
        }

        const value = draftRef.current[attributeId] ?? ''
        const saved = savedRef.current[attributeId] ?? ''

        if (toComparableAttributeValue(value) === toComparableAttributeValue(saved)) {
          continue
        }

        const version = versionsRef.current[attributeId] ?? 0
        const nextVersion = await saveAttributeValue(attributeId, value, version)
        savedRef.current[attributeId] = value
        versionsRef.current[attributeId] = nextVersion
      }
    } catch (flushError) {
      autosaveEnabledRef.current = false
      setAutosaveEnabled(false)
      setActionError(flushError instanceof Error ? flushError.message : 'error.profile.save')
    } finally {
      savingRef.current = false
      setIsSaving(false)
      const stillDirty = getDirtyIds(draftRef.current, savedRef.current).length > 0
      setAutosaveActive(autosaveEnabledRef.current && stillDirty)
    }
  }, [clearTimer, saveAttributeValue, setActionError, setAutosaveActive])

  const scheduleAutosave = useCallback(() => {
    if (!autosaveEnabledRef.current) {
      return
    }

    clearTimer()
    timerRef.current = window.setTimeout(() => {
      void flush()
    }, AUTOSAVE_DELAY_MS)
  }, [clearTimer, flush])

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    autosaveEnabledRef.current = autosaveEnabled
  }, [autosaveEnabled])

  useEffect(() => {
    if (isLoading) {
      return
    }

    clearTimer()
    const next = toDraftMap(meAttributes)
    draftRef.current = next
    setDraft(next)
    savedRef.current = { ...next }
    versionsRef.current = toVersionMap(meAttributes)
    setAutosaveEnabled(true)
    autosaveEnabledRef.current = true
    setActionError(null)
    setAutosaveActive(false)
  }, [meAttributes, isLoading, clearTimer, setActionError, setAutosaveActive])

  useEffect(() => {
    return () => {
      clearTimer()
      setAutosaveActive(false)

      if (!autosaveEnabledRef.current || savingRef.current) {
        return
      }

      const ids = getDirtyIds(draftRef.current, savedRef.current)
      for (const attributeId of ids) {
        const value = draftRef.current[attributeId] ?? ''
        const version = versionsRef.current[attributeId] ?? 0
        void saveAttributeValue(attributeId, value, version)
      }
    }
  }, [clearTimer, saveAttributeValue, setAutosaveActive])

  useEffect(() => {
    if (!error && !actionError) {
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error, actionError])

  const handleChange = (attributeId: number, value: AttributeDraftValue) => {
    const next = { ...draftRef.current, [attributeId]: value }
    draftRef.current = next
    setDraft(next)

    if (!autosaveEnabledRef.current) {
      autosaveEnabledRef.current = true
      setAutosaveEnabled(true)
      setActionError(null)
    }

    setAutosaveActive(true)
    scheduleAutosave()
  }

  const handleManualSave = () => {
    if (!isDirty && !isSaving) {
      return
    }

    void flush()
  }

  const handleForceSave = () => {
    void flush()
  }

  const canSave = autosaveEnabled && (isDirty || isSaving)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" component="h1">
          {t('profile.title')}
        </Typography>
        <IconButton
          aria-label={t('profile.save')}
          onClick={handleManualSave}
          disabled={!canSave}
          size="small"
          sx={{
            color: isAutosaveActive || isDirty ? 'success.main' : 'text.disabled',
            opacity: isAutosaveActive || isDirty ? 1 : 0.35,
            transition: 'color 0.2s ease, opacity 0.2s ease',
          }}
        >
          <SaveIcon sx={{ fontSize: 34 }} />
        </IconButton>
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
              draftValues={draft}
              onChange={handleChange}
              onForceSave={handleForceSave}
            />
            <AttributeSection
              title={t('profile.addedAttributes.title')}
              mode="attrs"
              attributes={addedAttributes}
              draftValues={draft}
              onChange={handleChange}
              onForceSave={handleForceSave}
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
