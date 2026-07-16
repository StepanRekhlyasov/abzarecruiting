import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { AbzaError } from '@features/abza-error'
import { AbzaForm } from '@features/abza-form'
import { createPositionInfoFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { areAbzaFormValuesEqual, useAutosave } from '@shared/lib/autosave'
import { formatDateTime } from '@shared/lib/date'
import { getErrorKey } from '@shared/lib/errors'
import type {
  AbzaFormValue,
  AbzaFormValues,
  AbzaSelectOption,
  AttributeConditionDraft,
} from '@shared/types'
import { loadTagOptions } from '@entities/tag'
import { AutosaveButton } from '@shared/ui'
import { PositionFormModal } from '../../positions-table/ui/PositionFormModal'
import { RestrictionsTab } from '../../positions-table/ui/RestrictionsTab'
import { CvsTable } from '../../cvs-table'
import { PositionDiscussion } from './PositionDiscussion'
import {
  PositionDetailProvider,
  positionAttributesToOptions,
  positionTagsToOptions,
  positionToFormValues,
  positionToInfoFormValues,
  usePositionDetail,
} from '../model'

const EMPTY_OPTIONS: AbzaSelectOption[] = []
const EMPTY_CONDITIONS: AttributeConditionDraft[] = []
const EMPTY_TAG_RESTRICTION_IDS = new Map<number, { id: number; version: number }>()
const EMPTY_ATTRIBUTE_RESTRICTION_IDS = new Map<string, { id: number; version: number }>()
const EMPTY_FORM_VALUES: AbzaFormValues = {}

type PositionDetailProps = {
  positionId: number
}

function PositionDetailContent() {
  const { t } = useTranslation()
  const {
    position,
    isLoading,
    isMutating,
    error,
    actionError,
    canEdit,
    canCreateResume,
    existingResumeId,
    isEditModalOpen,
    editDraft,
    restrictionsDraft,
    isRestrictionsLoading,
    isRestrictionsDirty,
    isRestrictionsSaving,
    tab,
    setTab,
    setActionError,
    setIsEditModalOpen,
    setRestrictionsRequiredTags,
    setRestrictionsAttributeConditions,
    handleEditClick,
    handleEditSubmit,
    handleDescriptionSubmit,
    handleRestrictionsSubmit,
    handleResumeAction,
    loadAttributeOptions,
    messages,
    isMessagesLoading,
    isMessageSubmitting,
    messagesError,
    canPostMessage,
    canDeleteMessages,
    canLinkCandidateProfile,
    handleCreateMessage,
    handleDeleteMessage,
    setMessagesError,
  } = usePositionDetail()

  const [formValues, setFormValues] = useState<AbzaFormValues>(EMPTY_FORM_VALUES)
  const [isAutosaveActive, setAutosaveActive] = useState(false)
  const formValuesRef = useRef(formValues)
  const savedValuesRef = useRef<AbzaFormValues>(EMPTY_FORM_VALUES)
  const pendingSaveRef = useRef<AbzaFormValues | null>(null)

  const editInitialInfo = useMemo(
    () => (position ? positionToInfoFormValues(position) : undefined),
    [position],
  )
  const editInitialAttributes = useMemo(
    () => (position ? positionAttributesToOptions(position) : EMPTY_OPTIONS),
    [position],
  )
  const editInitialTags = useMemo(
    () => (position ? positionTagsToOptions(position) : EMPTY_OPTIONS),
    [position],
  )

  const formConfig = useMemo(
    () =>
      createPositionInfoFormConfig(t, {
        readOnly: !canEdit,
        loadAttributeOptions,
        loadTagOptions,
        withRelations: true,
      }),
    [canEdit, i18n.language, loadAttributeOptions, t],
  )

  const isDirty = !areAbzaFormValuesEqual(formValues, savedValuesRef.current)
  const showDescriptionSaveButton = canEdit && tab === 'description'
  const showRestrictionsSaveButton = canEdit && tab === 'restrictions'

  const onFlush = useCallback(async () => {
    if (areAbzaFormValuesEqual(formValuesRef.current, savedValuesRef.current)) {
      setAutosaveActive(false)
      return
    }

    const toSave = formValuesRef.current
    pendingSaveRef.current = toSave

    try {
      await handleDescriptionSubmit(toSave)
    } catch (flushError) {
      pendingSaveRef.current = null
      throw flushError
    }

    if (areAbzaFormValuesEqual(formValuesRef.current, toSave)) {
      setAutosaveActive(false)
    }
  }, [handleDescriptionSubmit])

  const { isSaving, autosaveEnabled, flush, schedule, reset, reenable } = useAutosave({
    enabled: canEdit,
    onFlush,
    setActive: setAutosaveActive,
    onError: (flushError) => {
      setActionError(getErrorKey(flushError, 'error.positions.update'))
    },
  })

  useEffect(() => {
    formValuesRef.current = formValues
  }, [formValues])

  useEffect(() => {
    if (!position) {
      pendingSaveRef.current = null
      setFormValues(EMPTY_FORM_VALUES)
      savedValuesRef.current = EMPTY_FORM_VALUES
      reset(false)
      return
    }

    const next = positionToFormValues(position)
    const pending = pendingSaveRef.current

    if (pending) {
      pendingSaveRef.current = null

      if (areAbzaFormValuesEqual(formValuesRef.current, pending)) {
        formValuesRef.current = next
        setFormValues(next)
        savedValuesRef.current = next
      } else {
        savedValuesRef.current = next
      }
      return
    }

    formValuesRef.current = next
    setFormValues(next)
    savedValuesRef.current = next
    reset(canEdit)
  }, [canEdit, position, reset])

  const handleFieldChange = useCallback(
    (name: string, value: AbzaFormValue) => {
      if (!canEdit) {
        return
      }

      const next = { ...formValuesRef.current, [name]: value }
      formValuesRef.current = next
      setFormValues(next)
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

  const handleRestrictionsSave = useCallback(() => {
    if (!isRestrictionsDirty || isRestrictionsSaving) {
      return
    }

    void handleRestrictionsSubmit()
  }, [handleRestrictionsSubmit, isRestrictionsDirty, isRestrictionsSaving])

  const canSave = autosaveEnabled && (isDirty || isSaving)
  const canSaveRestrictions = isRestrictionsDirty || isRestrictionsSaving

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (error || !position) {
    return <AbzaError error={error ?? 'error.positions.load'} />
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ minWidth: 0 }}>
              {t('positions.detail.title', { name: position.name })}
            </Typography>
            {showDescriptionSaveButton ? (
              <AutosaveButton
                label={t('profile.save')}
                onClick={handleManualSave}
                disabled={!canSave}
                active={isAutosaveActive || isDirty}
              />
            ) : null}
            {showRestrictionsSaveButton ? (
              <AutosaveButton
                label={t('profile.save')}
                onClick={handleRestrictionsSave}
                disabled={!canSaveRestrictions}
                active={isRestrictionsDirty || isRestrictionsSaving}
              />
            ) : null}
          </Box>
          <Typography variant="body1" color="text.secondary">
            {t('positions.detail.postedBy', {
              name: position.createdByName || t('positions.detail.unknownAuthor'),
            })}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('positions.detail.postedAt', { date: formatDateTime(position.createdAt) })}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {canEdit ? (
            <Button
              variant="contained"
              onClick={() => void handleEditClick()}
              disabled={isMutating}
              sx={{ boxShadow: 'none' }}
            >
              {t('positions.detail.edit')}
            </Button>
          ) : null}

          {canCreateResume ? (
            <Button
              variant="contained"
              onClick={() => void handleResumeAction()}
              disabled={isMutating}
              sx={{ boxShadow: 'none' }}
            >
              {existingResumeId != null
                ? t('positions.detail.viewResume')
                : t('positions.detail.generateResume')}
            </Button>
          ) : null}
        </Box>
      </Box>

      <AbzaError error={actionError} onClose={() => setActionError(null)} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Tabs
          value={tab}
          onChange={(_, value: string) => setTab(value)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab value="description" label={t('positions.detail.tabs.description')} />
          {canEdit ? (
            <Tab value="restrictions" label={t('positions.detail.tabs.restrictions')} />
          ) : null}
          {canEdit ? <Tab value="cvs" label={t('positions.detail.tabs.cvs')} /> : null}
          <Tab value="discussion" label={t('positions.detail.tabs.discussion')} />
        </Tabs>

        {tab === 'description' ? (
          <AbzaForm
            hideSubmitButton
            config={formConfig}
            values={formValues}
            onFieldChange={handleFieldChange}
            onFieldBlur={() => {
              void flush()
            }}
          />
        ) : tab === 'restrictions' && canEdit ? (
          isRestrictionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <RestrictionsTab
              requiredTags={restrictionsDraft.requiredTags}
              onRequiredTagsChange={setRestrictionsRequiredTags}
              attributeConditions={restrictionsDraft.attributeConditions}
              onAttributeConditionsChange={setRestrictionsAttributeConditions}
              loadAttributeOptions={loadAttributeOptions}
              disabled={isRestrictionsSaving || isMutating}
            />
          )
        ) : tab === 'cvs' && canEdit ? (
          <CvsTable positionId={position.id} />
        ) : (
          <PositionDiscussion
            messages={messages}
            isLoading={isMessagesLoading}
            isSubmitting={isMessageSubmitting}
            error={messagesError}
            canPost={canPostMessage}
            canDelete={canDeleteMessages}
            canLinkCandidateProfile={canLinkCandidateProfile}
            onSubmit={handleCreateMessage}
            onDelete={handleDeleteMessage}
            onClearError={() => setMessagesError(null)}
          />
        )}
      </Box>

      {canEdit ? (
        <PositionFormModal
          open={isEditModalOpen && Boolean(editDraft)}
          mode="edit"
          isLoading={isMutating}
          initialInfo={editInitialInfo}
          initialAttributes={editInitialAttributes}
          initialTags={editInitialTags}
          initialRequiredTags={editDraft?.requiredTags ?? EMPTY_OPTIONS}
          initialAttributeConditions={editDraft?.attributeConditions ?? EMPTY_CONDITIONS}
          initialTagRestrictionIds={editDraft?.tagRestrictionIds ?? EMPTY_TAG_RESTRICTION_IDS}
          initialAttributeRestrictionIds={
            editDraft?.attributeRestrictionIds ?? EMPTY_ATTRIBUTE_RESTRICTION_IDS
          }
          loadAttributeOptions={loadAttributeOptions}
          onOpenChange={setIsEditModalOpen}
          onSubmit={handleEditSubmit}
        />
      ) : null}
    </Box>
  )
}

export function PositionDetail({ positionId }: PositionDetailProps) {
  return (
    <PositionDetailProvider positionId={positionId}>
      <PositionDetailContent />
    </PositionDetailProvider>
  )
}
