import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import { createProjectFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { formatDate, formatDateTime } from '@shared/lib/date'
import { AbzaError } from '@features/abza-error'
import { AbzaForm } from '@features/abza-form'
import { AbzaModal } from '@features/abza-modal'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import type { ProjectDto } from '@entities/project'
import { ProjectsTableProvider, projectToFormValues, useProjectsTable } from '../model'
import { ProjectsTableToolbar } from './Toolbar'

function ProjectsTableContent() {
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
    editingProject,
    canAccessProjects,
    canCreateProjects,
    showCandidateColumn,
    sortBy,
    sortDir,
    loadTagOptions,
    loadCandidateOptions,
    setPage,
    setPageSize,
    setSelectedIds,
    setIsCreateModalOpen,
    setIsEditModalOpen,
    setActionError,
    handleSortChange,
    handleCreateSubmit,
    handleEditSubmit,
    handleCreateModalSubmit,
    handleEditModalSubmit,
    handleRowClick,
    createFormRef,
    editFormRef,
  } = useProjectsTable()

  const createFormConfig = useMemo(
    () =>
      createProjectFormConfig(t, {
        loadTagOptions,
        loadCandidateOptions,
        showCandidateSelect: showCandidateColumn,
      }),
    [i18n.language, loadCandidateOptions, loadTagOptions, showCandidateColumn],
  )

  const editFormConfig = useMemo(
    () =>
      createProjectFormConfig(t, {
        loadTagOptions,
        showCandidateSelect: false,
      }),
    [i18n.language, loadTagOptions],
  )

  const columns = useMemo<AbzaTableColumn<ProjectDto>[]>(() => {
    const next: AbzaTableColumn<ProjectDto>[] = [
      {
        id: 'name',
        label: t('projects.columns.name'),
        sortable: true,
        render: (row) => row.name,
      },
      {
        id: 'description',
        label: t('projects.columns.description'),
        sortable: false,
        render: (row) => row.description || '—',
      },
      {
        id: 'startAt',
        label: t('projects.columns.startAt'),
        sortable: true,
        render: (row) => formatDate(row.startAt),
      },
      {
        id: 'endAt',
        label: t('projects.columns.endAt'),
        sortable: true,
        render: (row) => formatDate(row.endAt),
      },
      {
        id: 'tags',
        label: t('projects.columns.tags'),
        sortable: false,
        render: (row) =>
          row.tags.length === 0 ? (
            '—'
          ) : (
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
              {row.tags.map((tag) => (
                <Chip key={tag.id} size="small" label={tag.name} />
              ))}
            </Stack>
          ),
      },
    ]

    if (showCandidateColumn) {
      next.push({
        id: 'candidateId',
        label: t('projects.columns.candidateId'),
        sortable: true,
        render: (row) => row.candidateId,
      })
    }

    next.push({
      id: 'createdAt',
      label: t('projects.columns.createdAt'),
      sortable: true,
      render: (row) => formatDateTime(row.createdAt),
    })

    return next
  }, [i18n.language, showCandidateColumn])

  if (!canAccessProjects) {
    return <AbzaError error="error.unauthorized" />
  }

  return (
    <>
      <AbzaError error={actionError} sx={{ mb: 2 }} onClose={() => setActionError(null)} />

      <AbzaTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        toolbar={<ProjectsTableToolbar />}
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
        selectable={canCreateProjects}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={handleRowClick}
        loading={isLoading}
        emptyMessage={t('projects.empty')}
        loadingMessage={t('projects.loading')}
      />

      <AbzaModal
        open={isCreateModalOpen}
        config={{
          title: t('projects.create.title'),
          submitLabel: t('projects.create.submit'),
          cancelLabel: t('projects.create.cancel'),
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

      <AbzaModal
        open={isEditModalOpen && Boolean(editingProject)}
        config={{
          title: t('projects.edit.title'),
          submitLabel: t('projects.edit.submit'),
          cancelLabel: t('projects.edit.cancel'),
        }}
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleEditModalSubmit}
        isLoading={isLoading}
        maxWidth="sm"
      >
        {editingProject && (
          <AbzaForm
            key={editingProject.id}
            formRef={editFormRef}
            hideSubmitButton
            config={editFormConfig}
            initialValues={projectToFormValues(editingProject)}
            onSubmit={handleEditSubmit}
            isLoading={isLoading}
          />
        )}
      </AbzaModal>
    </>
  )
}

export function ProjectsTable() {
  return (
    <ProjectsTableProvider>
      <ProjectsTableContent />
    </ProjectsTableProvider>
  )
}
