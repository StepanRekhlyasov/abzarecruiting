import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import { createAttributeFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { formatDateTime } from '@shared/lib/date'
import { AbzaError } from '@features/abza-error'
import { AbzaForm } from '@features/abza-form'
import { AbzaModal } from '@features/abza-modal'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import type { AttributeDto } from '@entities/attribute'
import {
  AttributesTableProvider,
  attributeToFormValues,
  useAttributesTable,
} from '../model'
import { AttributesTableToolbar } from './Toolbar'

function AttributesTableContent() {
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
    createFormError,
    isEditModalOpen,
    editFormError,
    editingAttribute,
    canManageAttributes,
    canLinkToProfile,
    isSelectable,
    linkedAttributeIdSet,
    sortBy,
    sortDir,
    setPage,
    setPageSize,
    setSelectedIds,
    setActionError,
    handleSortChange,
    handleCreateModalClose,
    handleEditModalClose,
    handleCreateSubmit,
    handleEditSubmit,
    handleCreateModalSubmit,
    handleEditModalSubmit,
    handleRowClick,
    createFormRef,
    editFormRef,
  } = useAttributesTable()

  const formConfig = useMemo(() => createAttributeFormConfig(t), [i18n.language])

  const columns = useMemo(() => {
    const baseColumns: AbzaTableColumn<AttributeDto>[] = [
      {
        id: 'name',
        label: t('attributes.columns.name'),
        sortable: true,
        render: (row) => row.name,
      },
      {
        id: 'description',
        label: t('attributes.columns.description'),
        sortable: true,
        render: (row) => row.description ?? '—',
      },
      {
        id: 'valueType',
        label: t('attributes.columns.valueType'),
        sortable: true,
        render: (row) => t(`attributes.valueTypes.${row.valueType}`, row.valueType),
      },
      {
        id: 'inputType',
        label: t('attributes.columns.inputType'),
        sortable: true,
        render: (row) => t(`attributes.inputTypes.${row.inputType}`, row.inputType),
      },
      {
        id: 'createdAt',
        label: t('attributes.columns.createdAt'),
        sortable: true,
        render: (row) => formatDateTime(row.createdAt),
      },
    ]

    if (canLinkToProfile) {
      baseColumns.push({
        id: 'inProfile',
        label: '',
        width: 56,
        align: 'right',
        render: (row) =>
          linkedAttributeIdSet.has(row.id) ? (
            <Box component="span" sx={{ color: 'success.main', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
              ✓
            </Box>
          ) : null,
      })
    }

    return baseColumns
  }, [i18n.language, canLinkToProfile, linkedAttributeIdSet])

  return (
    <>
      <AbzaError error={actionError} sx={{ mb: 2 }} onClose={() => setActionError(null)} />

      <AbzaTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        toolbar={<AttributesTableToolbar />}
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
        selectable={isSelectable}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={canManageAttributes ? handleRowClick : undefined}
        getRowSx={
          canLinkToProfile
            ? (row) =>
                linkedAttributeIdSet.has(row.id) ? { bgcolor: 'rgba(76, 175, 80, 0.12)' } : undefined
            : undefined
        }
        loading={isLoading}
        emptyMessage={t('attributes.empty')}
        loadingMessage={t('attributes.loading')}
      />

      <AbzaModal
        open={isCreateModalOpen}
        config={{
          title: t('attributes.create.title'),
          submitLabel: t('attributes.create.submit'),
          cancelLabel: t('attributes.create.cancel'),
        }}
        onClose={handleCreateModalClose}
        onSubmit={handleCreateModalSubmit}
        isLoading={isLoading}
      >
        <AbzaForm
          formRef={createFormRef}
          hideSubmitButton
          config={formConfig}
          onSubmit={handleCreateSubmit}
          isLoading={isLoading}
          serverError={createFormError}
        />
      </AbzaModal>

      <AbzaModal
        open={isEditModalOpen}
        config={{
          title: t('attributes.edit.title'),
          submitLabel: t('attributes.edit.submit'),
          cancelLabel: t('attributes.edit.cancel'),
        }}
        onClose={handleEditModalClose}
        onSubmit={handleEditModalSubmit}
        isLoading={isLoading}
      >
        <AbzaForm
          formRef={editFormRef}
          hideSubmitButton
          config={formConfig}
          initialValues={editingAttribute ? attributeToFormValues(editingAttribute) : undefined}
          onSubmit={handleEditSubmit}
          isLoading={isLoading}
          serverError={editFormError}
        />
      </AbzaModal>
    </>
  )
}

export function AttributesTable() {
  return (
    <AttributesTableProvider>
      <AttributesTableContent />
    </AttributesTableProvider>
  )
}
