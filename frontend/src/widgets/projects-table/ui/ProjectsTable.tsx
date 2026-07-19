import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
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
import { projectToFormValues, type ProjectDto } from '@entities/project'
import { TagsField } from '@entities/tag'
import { CandidateProfileLink } from '@shared/ui'
import { ProjectsTableProvider, useProjectsTable } from '../model'
import { ProjectsFilterModal } from './FilterModal'
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
    createTags,
    editTags,
    canAccessProjects,
    canCreateProjects,
    showCandidateColumn,
    showCandidateSelect,
    sortBy,
    sortDir,
    loadCandidateOptions,
    setPage,
    setPageSize,
    setSelectedIds,
    setIsCreateModalOpen,
    setIsEditModalOpen,
    setCreateTags,
    setEditTags,
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
        loadCandidateOptions,
        showCandidateSelect,
      }),
    [i18n.language, loadCandidateOptions, showCandidateSelect],
  )

  const editFormConfig = useMemo(() => createProjectFormConfig(t), [i18n.language])

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
        render: (row) => row.description,
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
          row.tags.length === 0 ? null : (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {row.tags.map((tag) => (
                <Chip key={tag.id} size="small" label={tag.name} />
              ))}
            </Stack>
          ),
      },
    ]

    if (showCandidateColumn) {
      next.push({
        id: 'candidateName',
        label: t('projects.columns.candidate'),
        sortable: true,
        render: (row) => (
          <CandidateProfileLink candidateId={row.candidateId}>
            {row.candidateName || row.candidateId}
          </CandidateProfileLink>
        ),
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

      <ProjectsFilterModal />

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <AbzaForm
            key={isCreateModalOpen ? 'create-open' : 'create-closed'}
            formRef={createFormRef}
            hideSubmitButton
            config={createFormConfig}
            onSubmit={handleCreateSubmit}
            isLoading={isLoading}
          />
          <TagsField
            label={t('projects.fields.tags')}
            value={createTags}
            onChange={setCreateTags}
            disabled={isLoading}
          />
        </Box>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <AbzaForm
              key={editingProject.id}
              formRef={editFormRef}
              hideSubmitButton
              config={editFormConfig}
              initialValues={projectToFormValues(editingProject)}
              onSubmit={handleEditSubmit}
              isLoading={isLoading}
            />
            <TagsField
              label={t('projects.fields.tags')}
              value={editTags}
              onChange={setEditTags}
              disabled={isLoading}
            />
          </Box>
        )}
      </AbzaModal>
    </>
  )
}

export function ProjectsTable({ candidateId }: { candidateId?: string }) {
  return (
    <ProjectsTableProvider candidateId={candidateId}>
      <ProjectsTableContent />
    </ProjectsTableProvider>
  )
}
