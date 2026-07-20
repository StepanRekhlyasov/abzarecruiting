import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import { i18n } from '@shared/config/i18n'
import { positionDetailPath } from '@shared/config/routes'
import { formatDateTime } from '@shared/lib/date'
import { AbzaError } from '@features/abza-error'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import { AbzaTableToolbar } from '@features/abza-table-toolbar'
import type { PositionDto } from '@entities/position'
import { PositionsTableProvider, usePositionsTable } from '../model'
import { PositionsFilterModal } from './FilterModal'
import { PositionFormModal } from './PositionFormModal'

function PositionsTableContent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    rows,
    totalCount,
    page,
    pageSize,
    selectedIds,
    isLoading,
    actionError,
    isCreateModalOpen,
    canManagePositions,
    canCreateResumes,
    resumePositionIdSet,
    sortBy,
    sortDir,
    loadAttributeOptions,
    setPage,
    setPageSize,
    setSelectedIds,
    setIsCreateModalOpen,
    setActionError,
    handleSortChange,
    handleCreateSubmit,
    handleFilter,
    handleCreateClick,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleCreateResumesSelected,
    isFilterActive,
    setIsFilterModalOpen,
  } = usePositionsTable()

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
        id: 'messagesCount',
        label: t('positions.columns.messagesCount'),
        sortable: true,
        render: (row) => row.messagesCount ?? 0,
      },
      {
        id: 'resumesCount',
        label: t('positions.columns.resumesCount'),
        sortable: true,
        render: (row) => row.resumesCount ?? 0,
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
  }, [i18n.language, canCreateResumes, resumePositionIdSet, t])

  return (
    <>
      <AbzaError error={actionError} sx={{ mb: 2 }} onClose={() => setActionError(null)} />

      <AbzaTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        toolbar={
          <AbzaTableToolbar
            disabled={isLoading}
            textSearch={{
              label: t('positions.search'),
              onSearch: handleFilter,
            }}
            filter={{
              active: isFilterActive,
              onClick: () => setIsFilterModalOpen(true),
              'aria-label': t('positions.actions.filter'),
            }}
            create={canManagePositions ? { onClick: handleCreateClick } : undefined}
            duplicate={
              canManagePositions
                ? {
                    onClick: handleDuplicateSelected,
                    disabled: selectedIds.length === 0,
                    'aria-label': t('positions.toolbar.duplicate'),
                  }
                : undefined
            }
            delete={
              canManagePositions
                ? {
                    onClick: handleDeleteSelected,
                    disabled: selectedIds.length === 0,
                  }
                : undefined
            }
            createResumes={
              canCreateResumes
                ? {
                    onClick: handleCreateResumesSelected,
                    disabled: selectedIds.length === 0,
                    label: t('positions.toolbar.createResume'),
                    'aria-label': t('positions.toolbar.createResume'),
                  }
                : undefined
            }
          />
        }
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
        onRowClick={(row) => navigate(positionDetailPath(row.id))}
        getRowSx={(row) => {
          if (canManagePositions && row.hasRestrictions) {
            return { bgcolor: 'rgba(244, 67, 54, 0.12)' }
          }

          if (canCreateResumes && resumePositionIdSet.has(row.id)) {
            return { bgcolor: 'rgba(76, 175, 80, 0.12)' }
          }

          return undefined
        }}
        loading={isLoading}
        emptyMessage={t('positions.empty')}
        loadingMessage={t('positions.loading')}
      />

      <PositionFormModal
        open={isCreateModalOpen}
        mode="create"
        isLoading={isLoading}
        loadAttributeOptions={loadAttributeOptions}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateSubmit}
      />

      <PositionsFilterModal />
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
