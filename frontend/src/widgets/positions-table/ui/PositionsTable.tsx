import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import { i18n } from '@shared/config/i18n'
import { formatDateTime } from '@shared/lib/date'
import { AbzaError } from '@features/abza-error'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import type { PositionDto } from '@entities/position'
import type { AbzaSelectOption, AttributeConditionDraft } from '@shared/types'
import {
  PositionsTableProvider,
  positionAttributesToOptions,
  positionTagsToOptions,
  positionToInfoFormValues,
  usePositionsTable,
} from '../model'
import { PositionFormModal } from './PositionFormModal'
import { PositionsTableToolbar } from './Toolbar'

const EMPTY_OPTIONS: AbzaSelectOption[] = []
const EMPTY_CONDITIONS: AttributeConditionDraft[] = []
const EMPTY_TAG_RESTRICTION_IDS = new Map<number, { id: number; version: number }>()
const EMPTY_ATTRIBUTE_RESTRICTION_IDS = new Map<string, { id: number; version: number }>()

function PositionsTableContent() {
  const { t } = useTranslation()
  const {
    rows,
    totalCount,
    page,
    pageSize,
    selectedIds,
    isLoading,
    actionError,
    isCreateModalOpen,
    isEditModalOpen,
    isViewModalOpen,
    editingPosition,
    editDraft,
    canManagePositions,
    canCreateResumes,
    resumePositionIdSet,
    sortBy,
    sortDir,
    loadAttributeOptions,
    loadTagOptions,
    setPage,
    setPageSize,
    setSelectedIds,
    setIsCreateModalOpen,
    setIsEditModalOpen,
    setIsViewModalOpen,
    setActionError,
    handleSortChange,
    handleCreateSubmit,
    handleEditSubmit,
    handleCreateResumeFromView,
    handleRowClick,
  } = usePositionsTable()

  const editInitialInfo = useMemo(
    () => (editingPosition ? positionToInfoFormValues(editingPosition) : undefined),
    [editingPosition],
  )
  const editInitialAttributes = useMemo(
    () => (editingPosition ? positionAttributesToOptions(editingPosition) : EMPTY_OPTIONS),
    [editingPosition],
  )
  const editInitialTags = useMemo(
    () => (editingPosition ? positionTagsToOptions(editingPosition) : EMPTY_OPTIONS),
    [editingPosition],
  )

  const hasResumeForEditing =
    editingPosition != null && resumePositionIdSet.has(editingPosition.id)

  const columns = useMemo<AbzaTableColumn<PositionDto>[]>(() => {
    const baseColumns: AbzaTableColumn<PositionDto>[] = [
      {
        id: 'name',
        label: t('positions.columns.name'),
        sortable: true,
        render: (row) => row.name,
      },
      {
        id: 'company',
        label: t('positions.columns.company'),
        sortable: true,
        render: (row) => row.company,
      },
      {
        id: 'country',
        label: t('positions.columns.country'),
        sortable: true,
        render: (row) => row.country,
      },
      {
        id: 'level',
        label: t('positions.columns.level'),
        sortable: true,
        render: (row) => t(`positions.levels.${row.level}`, row.level),
      },
      {
        id: 'format',
        label: t('positions.columns.format'),
        sortable: true,
        render: (row) => t(`positions.formats.${row.format}`, row.format),
      },
      {
        id: 'maxProjects',
        label: t('positions.columns.maxProjects'),
        sortable: true,
        render: (row) => row.maxProjects,
      },
      {
        id: 'createdAt',
        label: t('positions.columns.createdAt'),
        sortable: true,
        render: (row) => formatDateTime(row.createdAt),
      },
    ]

    if (canCreateResumes) {
      baseColumns.push({
        id: 'hasResume',
        label: '',
        width: 56,
        align: 'right',
        render: (row) =>
          resumePositionIdSet.has(row.id) ? (
            <Box component="span" sx={{ color: 'success.main', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
              ✓
            </Box>
          ) : null,
      })
    }

    return baseColumns
  }, [i18n.language, canCreateResumes, resumePositionIdSet])

  return (
    <>
      <AbzaError error={actionError} sx={{ mb: 2 }} onClose={() => setActionError(null)} />

      <AbzaTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        toolbar={<PositionsTableToolbar />}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(0)
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        selectable={canManagePositions || canCreateResumes}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={
          canManagePositions || canCreateResumes ? (row) => void handleRowClick(row) : undefined
        }
        getRowSx={
          canCreateResumes
            ? (row) =>
                resumePositionIdSet.has(row.id) ? { bgcolor: 'rgba(76, 175, 80, 0.12)' } : undefined
            : undefined
        }
        loading={isLoading}
        emptyMessage={t('positions.empty')}
        loadingMessage={t('positions.loading')}
      />

      <PositionFormModal
        open={isCreateModalOpen}
        mode="create"
        isLoading={isLoading}
        loadAttributeOptions={loadAttributeOptions}
        loadTagOptions={loadTagOptions}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateSubmit}
      />

      <PositionFormModal
        open={isEditModalOpen && Boolean(editingPosition) && Boolean(editDraft)}
        mode="edit"
        isLoading={isLoading}
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
        loadTagOptions={loadTagOptions}
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleEditSubmit}
      />

      <PositionFormModal
        open={isViewModalOpen && Boolean(editingPosition)}
        mode="view"
        isLoading={isLoading}
        initialInfo={editInitialInfo}
        initialAttributes={editInitialAttributes}
        initialTags={editInitialTags}
        loadAttributeOptions={loadAttributeOptions}
        loadTagOptions={loadTagOptions}
        onOpenChange={setIsViewModalOpen}
        onCreateResume={handleCreateResumeFromView}
        createResumeDisabled={hasResumeForEditing}
      />
    </>
  )
}

export function PositionsTable() {
  return (
    <PositionsTableProvider>
      <PositionsTableContent />
    </PositionsTableProvider>
  )
}
