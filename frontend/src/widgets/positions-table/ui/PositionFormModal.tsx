import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import {
  createPositionInfoFormConfig,
  createPositionRelationsFormConfig,
} from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { AbzaForm } from '@features/abza-form'
import { AbzaModal } from '@features/abza-modal'
import type { AttributeConditionDraft } from '@entities/restriction'
import type { AbzaFormValues, AbzaSelectOption } from '@shared/types'
import { getTagOptionsFromValues, loadTagOptions } from '@entities/tag'
import { RestrictionsTab } from './RestrictionsTab'

export type PositionFormSubmitPayload = {
  info: AbzaFormValues
  attributes: AbzaSelectOption[]
  tags: AbzaSelectOption[]
  requiredTags: AbzaSelectOption[]
  attributeConditions: AttributeConditionDraft[]
  initialTagRestrictionIds: Map<number, { id: number; version: number }>
  initialAttributeRestrictionIds: Map<string, { id: number; version: number }>
}

type RestrictionMeta = { id: number; version: number }

type PositionFormModalProps = {
  open: boolean
  mode: 'create' | 'edit' | 'view'
  isLoading?: boolean
  initialInfo?: AbzaFormValues
  initialAttributes?: AbzaSelectOption[]
  initialTags?: AbzaSelectOption[]
  initialRequiredTags?: AbzaSelectOption[]
  initialAttributeConditions?: AttributeConditionDraft[]
  initialTagRestrictionIds?: Map<number, RestrictionMeta>
  initialAttributeRestrictionIds?: Map<string, RestrictionMeta>
  loadAttributeOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  onOpenChange: (open: boolean) => void
  onSubmit?: (payload: PositionFormSubmitPayload) => Promise<void>
  onCreateResume?: () => Promise<void>
  createResumeDisabled?: boolean
}

const EMPTY_OPTIONS: AbzaSelectOption[] = []
const EMPTY_CONDITIONS: AttributeConditionDraft[] = []
const EMPTY_TAG_RESTRICTION_IDS = new Map<number, RestrictionMeta>()
const EMPTY_ATTRIBUTE_RESTRICTION_IDS = new Map<string, RestrictionMeta>()
const EMPTY_RELATION_VALUES: AbzaFormValues = {
  attributes: EMPTY_OPTIONS,
  tags: EMPTY_OPTIONS,
}

export function PositionFormModal({
  open,
  mode,
  isLoading = false,
  initialInfo,
  initialAttributes = EMPTY_OPTIONS,
  initialTags = EMPTY_OPTIONS,
  initialRequiredTags = EMPTY_OPTIONS,
  initialAttributeConditions = EMPTY_CONDITIONS,
  initialTagRestrictionIds = EMPTY_TAG_RESTRICTION_IDS,
  initialAttributeRestrictionIds = EMPTY_ATTRIBUTE_RESTRICTION_IDS,
  loadAttributeOptions,
  onOpenChange,
  onSubmit,
  onCreateResume,
  createResumeDisabled = false,
}: PositionFormModalProps) {
  const { t } = useTranslation()
  const formRef = useRef<HTMLFormElement>(null)
  const wasOpenRef = useRef(false)
  const isViewMode = mode === 'view'
  const initialsRef = useRef({
    initialAttributes,
    initialTags,
    initialRequiredTags,
    initialAttributeConditions,
    initialTagRestrictionIds,
    initialAttributeRestrictionIds,
  })
  initialsRef.current = {
    initialAttributes,
    initialTags,
    initialRequiredTags,
    initialAttributeConditions,
    initialTagRestrictionIds,
    initialAttributeRestrictionIds,
  }

  const [tab, setTab] = useState(0)
  const [relationValues, setRelationValues] = useState<AbzaFormValues>(EMPTY_RELATION_VALUES)
  const [requiredTags, setRequiredTags] = useState<AbzaSelectOption[]>(EMPTY_OPTIONS)
  const [attributeConditions, setAttributeConditions] =
    useState<AttributeConditionDraft[]>(EMPTY_CONDITIONS)
  const [tagRestrictionIds, setTagRestrictionIds] = useState(EMPTY_TAG_RESTRICTION_IDS)
  const [attributeRestrictionIds, setAttributeRestrictionIds] = useState(
    EMPTY_ATTRIBUTE_RESTRICTION_IDS,
  )

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }

    if (wasOpenRef.current) {
      return
    }

    wasOpenRef.current = true
    const initials = initialsRef.current
    setTab(0)
    setRelationValues({
      attributes: initials.initialAttributes,
      tags: initials.initialTags,
    })
    setRequiredTags(initials.initialRequiredTags)
    setAttributeConditions(initials.initialAttributeConditions)
    setTagRestrictionIds(initials.initialTagRestrictionIds)
    setAttributeRestrictionIds(initials.initialAttributeRestrictionIds)
  }, [open])

  const infoConfig = useMemo(
    () => createPositionInfoFormConfig(t, { readOnly: isViewMode }),
    [i18n.language, isViewMode, t],
  )

  const relationsConfig = useMemo(
    () =>
      createPositionRelationsFormConfig(t, {
        readOnly: isViewMode,
        loadAttributeOptions,
        loadTagOptions,
      }),
    [i18n.language, isViewMode, loadAttributeOptions, t],
  )

  const handleInfoSubmit = async (info: AbzaFormValues) => {
    if (!onSubmit) {
      return
    }

    await onSubmit({
      info,
      attributes: getTagOptionsFromValues(relationValues, 'attributes'),
      tags: getTagOptionsFromValues(relationValues, 'tags'),
      requiredTags,
      attributeConditions,
      initialTagRestrictionIds: tagRestrictionIds,
      initialAttributeRestrictionIds: attributeRestrictionIds,
    })
  }

  const modalTitle =
    mode === 'create'
      ? t('positions.create.title')
      : mode === 'view'
        ? t('positions.view.title')
        : t('positions.edit.title')

  const submitLabel =
    mode === 'create'
      ? t('positions.create.submit')
      : mode === 'view'
        ? t('positions.view.createResume')
        : t('positions.edit.submit')

  const cancelLabel =
    mode === 'create'
      ? t('positions.create.cancel')
      : mode === 'view'
        ? t('positions.view.cancel')
        : t('positions.edit.cancel')

  return (
    <AbzaModal
      open={open}
      config={{
        title: modalTitle,
        submitLabel,
        cancelLabel,
      }}
      onOpenChange={onOpenChange}
      onSubmit={() => {
        if (isViewMode) {
          void onCreateResume?.()
          return
        }

        setTab(0)
        queueMicrotask(() => formRef.current?.requestSubmit())
      }}
      isLoading={isLoading}
      submitDisabled={isViewMode && createResumeDisabled}
      maxWidth="md"
    >
      <Tabs value={tab} onChange={(_, value: number) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label={t('positions.tabs.info')} />
        <Tab label={t('positions.tabs.attributes')} />
        {!isViewMode && <Tab label={t('positions.tabs.restrictions')} />}
      </Tabs>

      <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
        <AbzaForm
          key={open ? `${mode}-${initialInfo?.name ?? 'new'}` : 'closed'}
          formRef={formRef}
          hideSubmitButton
          config={infoConfig}
          initialValues={initialInfo}
          onSubmit={handleInfoSubmit}
          isLoading={isLoading}
        />
      </Box>

      <Box sx={{ display: tab === 1 ? 'block' : 'none', pt: 1 }}>
        <AbzaForm
          key={open ? `${mode}-relations` : 'closed-relations'}
          hideSubmitButton
          config={relationsConfig}
          values={relationValues}
          onFieldChange={(name, value) => {
            setRelationValues((prev) => ({ ...prev, [name]: value }))
          }}
          isLoading={isLoading}
        />
      </Box>

      {!isViewMode && (
        <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
          <RestrictionsTab
            requiredTags={requiredTags}
            onRequiredTagsChange={setRequiredTags}
            attributeConditions={attributeConditions}
            onAttributeConditionsChange={setAttributeConditions}
            loadAttributeOptions={loadAttributeOptions}
            disabled={isLoading}
          />
        </Box>
      )}
    </AbzaModal>
  )
}
