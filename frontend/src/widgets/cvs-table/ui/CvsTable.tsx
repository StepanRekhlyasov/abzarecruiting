import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Chip from '@mui/material/Chip'
import { i18n } from '@shared/config/i18n'
import { cvDetailPath } from '@shared/config/routes'
import { formatDateTime } from '@shared/lib/date'
import { AbzaError } from '@features/abza-error'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import type { ResumeListItemDto } from '@entities/resume'
import { CvsTableProvider, useCvsTable } from '../model'
import { CvsTableToolbar } from './Toolbar'

function CvsTableContent() {
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
    canDeleteResumes,
    showCandidateColumn,
    sortBy,
    sortDir,
    setPage,
    setPageSize,
    setSelectedIds,
    setActionError,
    handleSortChange,
  } = useCvsTable()

  const columns = useMemo<AbzaTableColumn<ResumeListItemDto>[]>(() => {
    const next: AbzaTableColumn<ResumeListItemDto>[] = [
      {
        id: 'id',
        label: t('cvs.columns.id'),
        sortable: true,
        render: (row) => row.id,
      },
      {
        id: 'positionName',
        label: t('cvs.columns.positionName'),
        sortable: true,
        render: (row) => row.positionName,
      },
    ]

    if (showCandidateColumn) {
      next.push({
        id: 'candidateId',
        label: t('cvs.columns.candidateId'),
        sortable: false,
        render: (row) => row.candidateId,
      })
    }

    next.push(
      {
        id: 'published',
        label: t('cvs.columns.published'),
        sortable: true,
        render: (row) => (
          <Chip
            size="small"
            label={row.published ? t('cvs.published.yes') : t('cvs.published.no')}
            color={row.published ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        id: 'createdAt',
        label: t('cvs.columns.createdAt'),
        sortable: true,
        render: (row) => formatDateTime(row.createdAt),
      },
    )

    return next
  }, [i18n.language, showCandidateColumn])

  return (
    <>
      <AbzaError error={actionError} sx={{ mb: 2 }} onClose={() => setActionError(null)} />

      <AbzaTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        toolbar={<CvsTableToolbar />}
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
        selectable={canDeleteResumes}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => navigate(cvDetailPath(row.id))}
        loading={isLoading}
        emptyMessage={t('cvs.empty')}
        loadingMessage={t('cvs.loading')}
      />
    </>
  )
}

export function CvsTable() {
  return (
    <CvsTableProvider>
      <CvsTableContent />
    </CvsTableProvider>
  )
}
