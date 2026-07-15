import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { AbzaError } from '@features/abza-error'
import { formatDateTime } from '@shared/lib/date'
import type { AbzaSelectOption, AttributeConditionDraft } from '@shared/types'
import { PositionFormModal } from '../../positions-table/ui/PositionFormModal'
import {
  PositionDetailProvider,
  positionAttributesToOptions,
  positionTagsToOptions,
  positionToInfoFormValues,
  usePositionDetail,
} from '../model'

const EMPTY_OPTIONS: AbzaSelectOption[] = []
const EMPTY_CONDITIONS: AttributeConditionDraft[] = []
const EMPTY_TAG_RESTRICTION_IDS = new Map<number, { id: number; version: number }>()
const EMPTY_ATTRIBUTE_RESTRICTION_IDS = new Map<string, { id: number; version: number }>()

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
    tab,
    setTab,
    setActionError,
    setIsEditModalOpen,
    handleEditClick,
    handleEditSubmit,
    handleResumeAction,
    loadAttributeOptions,
  } = usePositionDetail()

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
      <AbzaError error={actionError} onClose={() => setActionError(null)} />

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
          <Typography variant="h5" component="h1">
            {t('positions.detail.title', { name: position.name })}
          </Typography>
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

      <Box>
        <Tabs value={tab} onChange={(_, value: string) => setTab(value)}>
          <Tab value="description" label={t('positions.detail.tabs.description')} />
          <Tab value="discussion" label={t('positions.detail.tabs.discussion')} />
        </Tabs>
        <Box sx={{ py: 3 }}>
          {tab === 'description' ? (
            <Typography color="text.secondary">{t('positions.detail.tabsEmpty')}</Typography>
          ) : (
            <Typography color="text.secondary">{t('positions.detail.tabsEmpty')}</Typography>
          )}
        </Box>
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
