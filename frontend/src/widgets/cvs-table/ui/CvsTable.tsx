import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Chip from '@mui/material/Chip'
import { createResumeFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { cvDetailPath } from '@shared/config/routes'
import { formatDateTime } from '@shared/lib/date'
import { AbzaError } from '@features/abza-error'
import { AbzaForm } from '@features/abza-form'
import { AbzaModal } from '@features/abza-modal'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import { AbzaTableToolbar } from '@features/abza-table-toolbar'
import { ResumeLike } from '@features/resume-like'
import type { ResumeListItemDto } from '@entities/resume'
import { getErrorKey } from '@shared/lib/errors'
import { CandidateProfileLink } from '@shared/ui'
import { CvsTableProvider, useCvsTable } from '../model'

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
    isCreateModalOpen,
    canCreateResumes,
    canDeleteResumes,
    canLikeResumes,
    showCandidateColumn,
    showPositionColumn,
    showPublishedColumn,
    showCandidateSelect,
    canLinkCandidateProfile,
    sortBy,
    sortDir,
    createFormRef,
    loadPositionOptions,
    loadCandidateOptions,
    setPage,
    setPageSize,
    setSelectedIds,
    setActionError,
    setIsCreateModalOpen,
    handleSortChange,
    handleCreateSubmit,
    handleCreateModalSubmit,
    handleLikeChange,
    handleFilter,
    handleCreateClick,
    handleDeleteSelected,
  } = useCvsTable()

  const createFormConfig = useMemo(
    () =>
      createResumeFormConfig(t, {
        loadPositionOptions,
        loadCandidateOptions,
        showCandidateSelect,
      }),
    [i18n.language, loadCandidateOptions, loadPositionOptions, showCandidateSelect, t],
  )

  const columns = useMemo<AbzaTableColumn<ResumeListItemDto>[]>(() => {
    const next: AbzaTableColumn<ResumeListItemDto>[] = [
      {
        id: 'id',
        label: t('cvs.columns.id'),
        sortable: true,
        render: (row) => row.id,
      },
    ]

    if (showPositionColumn) {
      next.push({
        id: 'positionName',
        label: t('cvs.columns.positionName'),
        sortable: true,
        render: (row) => row.positionName,
      })
    }

    if (showCandidateColumn) {
      next.push({
        id: 'candidateName',
        label: t('cvs.columns.candidateId'),
        sortable: true,
        render: (row) => (
          <CandidateProfileLink candidateId={row.candidateId} enabled={canLinkCandidateProfile}>
            {row.candidateName || row.candidateId}
          </CandidateProfileLink>
        ),
      })
    }

    if (showPublishedColumn) {
      next.push({
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
      })
    }

    next.push(
      {
        id: 'createdAt',
        label: t('cvs.columns.createdAt'),
        sortable: true,
        render: (row) => formatDateTime(row.createdAt),
      },
      {
        id: 'likes',
        label: t('cvs.columns.likes'),
        sortable: true,
        render: (row) => (
          <ResumeLike
            resumeId={row.id}
            likesCount={row.likesCount}
            likedByCurrentUser={row.likedByCurrentUser}
            canToggle={canLikeResumes && row.published}
            onChange={(state) => handleLikeChange(row.id, state)}
            onError={(error) => setActionError(getErrorKey(error, 'error.resumes.like'))}
          />
        ),
      },
    )

    return next
  }, [
    canLikeResumes,
    canLinkCandidateProfile,
    handleLikeChange,
    i18n.language,
    setActionError,
    showCandidateColumn,
    showPositionColumn,
    showPublishedColumn,
    t,
  ])

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
              label: t('cvs.search'),
              onSearch: handleFilter,
            }}
            create={canCreateResumes ? { onClick: handleCreateClick } : undefined}
            delete={
              canDeleteResumes
                ? {
                    onClick: handleDeleteSelected,
                    disabled: selectedIds.length === 0,
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
        selectable={canDeleteResumes}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => navigate(cvDetailPath(row.id))}
        loading={isLoading}
        emptyMessage={t('cvs.empty')}
        loadingMessage={t('cvs.loading')}
      />

      {canCreateResumes ? (
        <AbzaModal
          open={isCreateModalOpen}
          config={{
            title: t('cvs.create.title'),
            submitLabel: t('cvs.create.submit'),
            cancelLabel: t('cvs.create.cancel'),
          }}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateModalSubmit}
          isLoading={isLoading}
          maxWidth="sm"
        >
          <AbzaForm
            key={isCreateModalOpen ? 'create-open' : 'create-closed'}
            formRef={createFormRef}
            hideSubmitButton
            config={createFormConfig}
            onSubmit={handleCreateSubmit}
            isLoading={isLoading}
          />
        </AbzaModal>
      ) : null}
    </>
  )
}

type CvsTableProps = {
  candidateId?: string
  positionId?: number
}

export function CvsTable({ candidateId, positionId }: CvsTableProps) {
  return (
    <CvsTableProvider candidateId={candidateId} positionId={positionId}>
      <CvsTableContent />
    </CvsTableProvider>
  )
}
