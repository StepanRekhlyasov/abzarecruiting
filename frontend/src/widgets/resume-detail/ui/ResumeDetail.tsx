import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DownloadIcon from '@mui/icons-material/Download'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { AbzaError } from '@features/abza-error'
import {
  toComparableAttributeValue,
  type AttributeDraftValue,
  type ProfileAttributeDto,
} from '@shared/types'
import { AttributeSection } from '@widgets/candidate-profile'
import { ResumeDetailProvider, useResumeDetail } from '../model'
import { ResumeProjectsSection } from '../parts/ResumeProjectsSection'

const AUTOSAVE_DELAY_MS = 5000

type ResumeDetailProps = {
  resumeId: number
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

function hasAllAttributeValues(
  attributes: ProfileAttributeDto[],
  draft: Record<number, AttributeDraftValue>,
) {
  return attributes.every(
    (attribute) => toComparableAttributeValue(draft[attribute.id] ?? '').trim() !== '',
  )
}

function withResumeAttributeLabels(
  attributes: ProfileAttributeDto[],
  t: (key: string) => string,
): ProfileAttributeDto[] {
  return attributes.map((attribute) => {
    if (attribute.name === 'Email') {
      return { ...attribute, name: t('cvs.detail.labels.email') }
    }

    if (attribute.name === 'Phone number') {
      return { ...attribute, name: t('cvs.detail.labels.phone') }
    }

    if (attribute.name === 'Profile photo') {
      return { ...attribute, name: t('cvs.detail.labels.photo') }
    }

    return attribute
  })
}

function ResumeDetailContent() {
  const { t } = useTranslation()
  const {
    resume,
    attributes,
    projects,
    isLoading,
    isMutating,
    error,
    actionError,
    canEdit,
    isAutosaveActive,
    isDownloading,
    setActionError,
    setAutosaveActive,
    saveAttributeValue,
    togglePublished,
    downloadPdf,
  } = useResumeDetail()

  const [draft, setDraft] = useState<Record<number, AttributeDraftValue>>({})
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const draftRef = useRef(draft)
  const savedRef = useRef<Record<number, AttributeDraftValue>>({})
  const versionsRef = useRef<Record<number, number>>({})
  const timerRef = useRef<number | null>(null)
  const autosaveEnabledRef = useRef(true)
  const savingRef = useRef(false)

  const dirtyIds = getDirtyIds(draft, savedRef.current)
  const isDirty = dirtyIds.length > 0
  const allFilled = hasAllAttributeValues(attributes, draft)
  const displayAttributes = useMemo(
    () => withResumeAttributeLabels(attributes, t),
    [attributes, t],
  )

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const flush = useCallback(async () => {
    clearTimer()

    if (!autosaveEnabledRef.current || savingRef.current || !canEdit) {
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
  }, [canEdit, clearTimer, saveAttributeValue, setActionError, setAutosaveActive])

  const scheduleAutosave = useCallback(() => {
    if (!autosaveEnabledRef.current || !canEdit) {
      return
    }

    clearTimer()
    timerRef.current = window.setTimeout(() => {
      void flush()
    }, AUTOSAVE_DELAY_MS)
  }, [canEdit, clearTimer, flush])

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
    const next = toDraftMap(attributes)
    draftRef.current = next
    setDraft(next)
    savedRef.current = { ...next }
    versionsRef.current = toVersionMap(attributes)
    setAutosaveEnabled(true)
    autosaveEnabledRef.current = true
    setActionError(null)
    setAutosaveActive(false)
  }, [attributes, isLoading, clearTimer, setActionError, setAutosaveActive])

  useEffect(() => {
    return () => {
      clearTimer()
      setAutosaveActive(false)

      if (!autosaveEnabledRef.current || savingRef.current || !canEdit) {
        return
      }

      const ids = getDirtyIds(draftRef.current, savedRef.current)
      for (const attributeId of ids) {
        const value = draftRef.current[attributeId] ?? ''
        const version = versionsRef.current[attributeId] ?? 0
        void saveAttributeValue(attributeId, value, version)
      }
    }
  }, [canEdit, clearTimer, saveAttributeValue, setAutosaveActive])

  const handleChange = (attributeId: number, value: AttributeDraftValue) => {
    if (!canEdit) {
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

  const handlePublishClick = async () => {
    await flush()
    await togglePublished()
  }

  const publishDisabled = useMemo(() => {
    if (!canEdit || isMutating || isSaving) {
      return true
    }

    if (resume?.published) {
      return false
    }

    return !allFilled
  }, [allFilled, canEdit, isMutating, isSaving, resume?.published])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (error || !resume) {
    return <AbzaError error={error ?? 'error.resumes.load'} />
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <AbzaError error={actionError} onClose={() => setActionError(null)} />

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography variant="h5" component="h1" sx={{ minWidth: 0 }}>
          {t('cvs.detail.forPosition', { name: resume.positionName })}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {canEdit && isAutosaveActive ? (
            <IconButton
              color="primary"
              onClick={() => void flush()}
              disabled={isSaving || !isDirty}
              aria-label={t('profile.save')}
            >
              {isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
            </IconButton>
          ) : null}

          {canEdit ? (
            <>
              {!resume.published ? (
                <Tooltip title={t('cvs.detail.publishHint')}>
                  <InfoOutlinedIcon color="action" fontSize="small" sx={{ mr: 0.5 }} />
                </Tooltip>
              ) : null}
              <Button
                variant="contained"
                onClick={() => void handlePublishClick()}
                disabled={publishDisabled}
                sx={{ boxShadow: 'none' }}
              >
                {resume.published ? t('cvs.detail.unpublish') : t('cvs.detail.publish')}
              </Button>
            </>
          ) : null}

          {resume.published ? (
            <Tooltip title={t('cvs.detail.downloadPdf')}>
              <span>
                <IconButton
                  color="primary"
                  onClick={() => void downloadPdf()}
                  disabled={isDownloading}
                  aria-label={t('cvs.detail.downloadPdf')}
                >
                  {isDownloading ? <CircularProgress size={20} /> : <DownloadIcon />}
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h6" component="h2">
          {t('cvs.detail.attributes')}
        </Typography>
        <AttributeSection
          mode="default"
          attributes={displayAttributes}
          draftValues={draft}
          onChange={handleChange}
          onForceSave={() => {
            void flush()
          }}
          emptyMessage={t('cvs.detail.attributesEmpty')}
          editable={canEdit}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h6" component="h2">
          {t('cvs.detail.projects')}
          {resume.maxProjects > 0 ? (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({t('cvs.detail.maxProjects', { count: resume.maxProjects })})
            </Typography>
          ) : null}
        </Typography>
        <ResumeProjectsSection projects={projects} />
      </Box>
    </Box>
  )
}

export function ResumeDetail({ resumeId }: ResumeDetailProps) {
  return (
    <ResumeDetailProvider resumeId={resumeId}>
      <ResumeDetailContent />
    </ResumeDetailProvider>
  )
}
