import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { AbzaError } from '@features/abza-error'
import { AbzaForm } from '@features/abza-form'
import { AbzaModal } from '@features/abza-modal'
import { createProjectFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { projectToFormValues, type ProjectDto } from '@entities/project'
import {
  toComparableAttributeValue,
  type AbzaFormValues,
  type AttributeDraftValue,
  type ProfileAttributeDto,
} from '@shared/types'
import { CandidateProfileProvider, useCandidateProfile } from './model'
import { AttributeSection } from './parts/AttributeSection'
import { ProjectsSection } from './parts/ProjectsSection'

const AUTOSAVE_DELAY_MS = 5000

type ProfileTab = 'info' | 'attributes' | 'projects'

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
    projects,
    isLoading,
    isMutating,
    error,
    actionError,
    setActionError,
    isAutosaveActive,
    setAutosaveActive,
    saveAttributeValue,
    loadAttributeOptions,
    loadTagOptions,
    addAttributesToProfile,
    removeAttributesFromProfile,
    createCandidateProject,
    updateCandidateProject,
  } = useCandidateProfile()

  const [activeTab, setActiveTab] = useState<ProfileTab>('info')
  const [draft, setDraft] = useState<Record<number, AttributeDraftValue>>({})
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null)
  const createFormRef = useRef<HTMLFormElement>(null)
  const editFormRef = useRef<HTMLFormElement>(null)

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

  const projectFormConfig = useMemo(
    () => createProjectFormConfig(t, { loadTagOptions, showCandidateSelect: false }),
    [i18n.language, loadTagOptions],
  )

  const dirtyIds = getDirtyIds(draft, savedRef.current)
  const isDirty = dirtyIds.length > 0
  const showSaveButton = activeTab === 'info' || activeTab === 'attributes'

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

  const handleAddAttributes = async (attributeIds: number[]) => {
    await addAttributesToProfile(attributeIds)
  }

  const handleRemoveAttribute = async (attributeId: number) => {
    clearTimer()
    await removeAttributesFromProfile([attributeId])
  }

  const handleCreateProject = async (values: AbzaFormValues) => {
    await createCandidateProject(values)
    setIsCreateProjectOpen(false)
  }

  const handleEditProject = async (values: AbzaFormValues) => {
    if (!editingProject) {
      return
    }

    await updateCandidateProject(editingProject.id, values, editingProject)
    setEditingProject(null)
  }

  const canSave = autosaveEnabled && (isDirty || isSaving)

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
        isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
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
            </Tabs>

            {activeTab === 'info' ? (
              <AttributeSection
                mode="default"
                attributes={defaultAttributes}
                draftValues={draft}
                onChange={handleChange}
                onForceSave={handleForceSave}
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
                loadAttributeOptions={loadAttributeOptions}
                onAddAttributes={handleAddAttributes}
                onRemoveAttribute={handleRemoveAttribute}
                isAdding={isMutating}
              />
            ) : null}

            {activeTab === 'projects' ? (
              <ProjectsSection
                projects={projects}
                onAddClick={() => setIsCreateProjectOpen(true)}
                onEditClick={setEditingProject}
                disabled={isMutating}
              />
            ) : null}
          </Box>
        )
      ) : null}

      <AbzaModal
        open={isCreateProjectOpen}
        config={{
          title: t('projects.create.title'),
          submitLabel: t('projects.create.submit'),
          cancelLabel: t('projects.create.cancel'),
        }}
        onOpenChange={setIsCreateProjectOpen}
        onSubmit={() => createFormRef.current?.requestSubmit()}
        isLoading={isMutating}
        maxWidth="sm"
      >
        <AbzaForm
          key={isCreateProjectOpen ? 'create-open' : 'create-closed'}
          formRef={createFormRef}
          hideSubmitButton
          config={projectFormConfig}
          onSubmit={handleCreateProject}
          isLoading={isMutating}
        />
      </AbzaModal>

      <AbzaModal
        open={Boolean(editingProject)}
        config={{
          title: t('projects.edit.title'),
          submitLabel: t('projects.edit.submit'),
          cancelLabel: t('projects.edit.cancel'),
        }}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProject(null)
          }
        }}
        onSubmit={() => editFormRef.current?.requestSubmit()}
        isLoading={isMutating}
        maxWidth="sm"
      >
        {editingProject ? (
          <AbzaForm
            key={editingProject.id}
            formRef={editFormRef}
            hideSubmitButton
            config={projectFormConfig}
            initialValues={projectToFormValues(editingProject)}
            onSubmit={handleEditProject}
            isLoading={isMutating}
          />
        ) : null}
      </AbzaModal>
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
