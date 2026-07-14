import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { useUnit } from 'effector-react'
import { AbzaError } from '@features/abza-error'
import { $session, isAdmin, isCandidate } from '@entities/user'
import {
  toComparableAttributeValue,
  toAttributeDraftValue,
  type AttributeDraftValue,
  type ProfileAttributeDto,
} from '@shared/types'
import { CvsTable } from '@widgets/cvs-table'
import { ProjectsTable } from '@widgets/projects-table'
import { CandidateProfileProvider, useCandidateProfile } from './model'
import { AttributeSection } from './parts/AttributeSection'

const AUTOSAVE_DELAY_MS = 5000

type ProfileTab = 'info' | 'attributes' | 'projects' | 'resumes'

type ProfileProps = {
  candidateId: string
}

function toDraftMap(attributes: ProfileAttributeDto[]) {
  return Object.fromEntries(
    attributes.map((attribute) => [attribute.id, toAttributeDraftValue(attribute)]),
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
  const session = useUnit($session)
  const {
    candidateId,
    meAttributes,
    isLoading,
    isMutating,
    error,
    actionError,
    setActionError,
    isAutosaveActive,
    setAutosaveActive,
    saveAttributeValue,
    loadAttributeOptions,
    addAttributesToProfile,
    removeAttributesFromProfile,
  } = useCandidateProfile()

  const canEditProfile = isAdmin(session) || (isCandidate(session) && session?.id === candidateId)

  const [activeTab, setActiveTab] = useState<ProfileTab>('info')
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
  const showSaveButton = canEditProfile && (activeTab === 'info' || activeTab === 'attributes')

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const flush = useCallback(async () => {
    clearTimer()

    if (!canEditProfile || !autosaveEnabledRef.current || savingRef.current) {
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
  }, [canEditProfile, clearTimer, saveAttributeValue, setActionError, setAutosaveActive])

  const scheduleAutosave = useCallback(() => {
    if (!canEditProfile || !autosaveEnabledRef.current) {
      return
    }

    clearTimer()
    timerRef.current = window.setTimeout(() => {
      void flush()
    }, AUTOSAVE_DELAY_MS)
  }, [canEditProfile, clearTimer, flush])

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
    setAutosaveEnabled(canEditProfile)
    autosaveEnabledRef.current = canEditProfile
    setActionError(null)
    setAutosaveActive(false)
  }, [meAttributes, isLoading, canEditProfile, clearTimer, setActionError, setAutosaveActive])

  useEffect(() => {
    return () => {
      clearTimer()
      setAutosaveActive(false)

      if (!canEditProfile || !autosaveEnabledRef.current || savingRef.current) {
        return
      }

      const ids = getDirtyIds(draftRef.current, savedRef.current)
      for (const attributeId of ids) {
        const value = draftRef.current[attributeId] ?? ''
        const version = versionsRef.current[attributeId] ?? 0
        void saveAttributeValue(attributeId, value, version)
      }
    }
  }, [canEditProfile, clearTimer, saveAttributeValue, setAutosaveActive])

  useEffect(() => {
    if (!error && !actionError) {
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error, actionError])

  const handleChange = (attributeId: number, value: AttributeDraftValue) => {
    if (!canEditProfile) {
      return
    }

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

  const handleAddAttributes = async (attributeIds: number[]) => {
    await addAttributesToProfile(attributeIds)
  }

  const handleRemoveAttribute = async (attributeId: number) => {
    clearTimer()
    await removeAttributesFromProfile([attributeId])
  }

  const canSave = autosaveEnabled && (isDirty || isSaving)
  const showStandaloneTable = activeTab === 'projects' || activeTab === 'resumes'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" component="h1">
          {t('profile.title')}
        </Typography>
        {showSaveButton ? (
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
        ) : null}
      </Box>

      <AbzaError error={error} />
      <AbzaError error={actionError} onClose={() => setActionError(null)} />

      {!error ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Tabs
            value={activeTab}
            onChange={(_, value: ProfileTab) => setActiveTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab value="info" label={t('profile.meInfo.title')} />
            <Tab value="attributes" label={t('profile.addedAttributes.title')} />
            <Tab value="projects" label={t('profile.projects.title')} />
            <Tab value="resumes" label={t('profile.resumes.title')} />
          </Tabs>

          {showStandaloneTable ? (
            activeTab === 'projects' ? (
              <ProjectsTable candidateId={candidateId} />
            ) : (
              <CvsTable candidateId={candidateId} />
            )
          ) : isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <>
              {activeTab === 'info' ? (
                <AttributeSection
                  mode="default"
                  attributes={defaultAttributes}
                  draftValues={draft}
                  onChange={handleChange}
                  onForceSave={handleForceSave}
                  editable={canEditProfile}
                />
              ) : null}

              {activeTab === 'attributes' ? (
                <AttributeSection
                  mode="attrs"
                  attributes={addedAttributes}
                  draftValues={draft}
                  onChange={handleChange}
                  onForceSave={handleForceSave}
                  emptyMessage={t('profile.addedAttributes.empty')}
                  loadAttributeOptions={canEditProfile ? loadAttributeOptions : undefined}
                  onAddAttributes={canEditProfile ? handleAddAttributes : undefined}
                  onRemoveAttribute={canEditProfile ? handleRemoveAttribute : undefined}
                  isAdding={isMutating}
                  editable={canEditProfile}
                />
              ) : null}
            </>
          )}
        </Box>
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
