import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { createTagFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { formatDateTime } from '@shared/lib/date'
import { AbzaError } from '@features/abza-error'
import { AbzaForm } from '@features/abza-form'
import { AbzaModal } from '@features/abza-modal'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import { AbzaTableToolbar } from '@features/abza-table-toolbar'
import type { TagDto } from '@entities/tag'
import { TagsTableProvider, tagToFormValues, useTagsTable } from '../model'

function TagsTableContent() {
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
    editingTag,
    canManageTags,
    sortBy,
    sortDir,
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
    searchTags,
    setSearchTags,
    canCreateTags,
    handleCreateClick,
    handleDeleteSelected,
    createFormRef,
    editFormRef,
  } = useTagsTable()

  const formConfig = useMemo(() => createTagFormConfig(t), [i18n.language])

  const columns = useMemo<AbzaTableColumn<TagDto>[]>(
    () => [
      {
        id: 'name',
        label: t('tags.columns.name'),
        sortable: true,
        render: (row) => row.name,
      },
      {
        id: 'createdAt',
        label: t('tags.columns.createdAt'),
        sortable: true,
        render: (row) => formatDateTime(row.createdAt),
      },
    ],
    [i18n.language],
  )

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
            tagsSearch={{
              label: t('tags.search'),
              value: searchTags,
              onChange: setSearchTags,
              allowCreate: true,
              createOnSelect: false,
              createOptionLabel: (name) => t('tags.searchAdd', { name }),
            }}
            create={canCreateTags ? { onClick: handleCreateClick } : undefined}
            delete={
              canManageTags
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
        selectable={canManageTags}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={canManageTags ? handleRowClick : undefined}
        loading={isLoading}
        emptyMessage={t('tags.empty')}
        loadingMessage={t('tags.loading')}
      />

      <AbzaModal
        open={isCreateModalOpen}
        config={{
          title: t('tags.create.title'),
          submitLabel: t('tags.create.submit'),
          cancelLabel: t('tags.create.cancel'),
        }}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateModalSubmit}
        isLoading={isLoading}
      >
        <AbzaForm
          formRef={createFormRef}
          hideSubmitButton
          config={formConfig}
          onSubmit={handleCreateSubmit}
          isLoading={isLoading}
        />
      </AbzaModal>

      <AbzaModal
        open={isEditModalOpen}
        config={{
          title: t('tags.edit.title'),
          submitLabel: t('tags.edit.submit'),
          cancelLabel: t('tags.edit.cancel'),
        }}
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleEditModalSubmit}
        isLoading={isLoading}
      >
        {editingTag ? (
          <AbzaForm
            formRef={editFormRef}
            hideSubmitButton
            config={formConfig}
            initialValues={tagToFormValues(editingTag)}
            onSubmit={handleEditSubmit}
            isLoading={isLoading}
          />
        ) : null}
      </AbzaModal>
    </>
  )
}

export function TagsTable() {
  return (
    <TagsTableProvider>
      <TagsTableContent />
    </TagsTableProvider>
  )
}
