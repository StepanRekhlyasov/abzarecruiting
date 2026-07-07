import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import { createAttributeFormConfig } from '@shared/config/forms'
import { OptionTags } from '@/features/inputs'
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
    createValueType,
    createSelectOptions,
    isEditModalOpen,
    editFormError,
    editValueType,
    editingAttribute,
    editSelectOptions,
    canManageAttributes,
    canLinkToProfile,
    isSelectable,
    linkedAttributeIdSet,
    setPage,
    setPageSize,
    setSelectedIds,
    setActionError,
    setCreateValueType,
    setCreateSelectOptions,
    setEditValueType,
    setEditSelectOptions,
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

  const createFormConfig = useMemo(() => createAttributeFormConfig(t, createValueType), [t, createValueType])
  const editFormConfig = useMemo(() => createAttributeFormConfig(t, editValueType), [t, editValueType])

  const columns = useMemo(() => {
    const baseColumns: AbzaTableColumn<AttributeDto>[] = [
      {
        id: 'name',
        label: t('attributes.columns.name'),
        render: (row) => row.name,
      },
      {
        id: 'description',
        label: t('attributes.columns.description'),
        render: (row) => row.description ?? '—',
      },
      {
        id: 'valueType',
        label: t('attributes.columns.valueType'),
        render: (row) => t(`attributes.valueTypes.${row.valueType}`, row.valueType),
      },
      {
        id: 'inputType',
        label: t('attributes.columns.inputType'),
        render: (row) => t(`attributes.inputTypes.${row.inputType}`, row.inputType),
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
  }, [t, canLinkToProfile, linkedAttributeIdSet])

  return (
    <>
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

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
          config={createFormConfig}
          resetKey={isCreateModalOpen ? 'create' : 'closed'}
          onValuesChange={(values) => {
            const nextValueType = values.valueType ?? ''
            setCreateValueType(nextValueType)
            if (nextValueType !== 'select') {
              setCreateSelectOptions([])
            }
          }}
          onSubmit={handleCreateSubmit}
          isLoading={isLoading}
          serverError={createFormError}
        />

        {createValueType === 'select' && (
          <OptionTags
            options={createSelectOptions}
            onChange={setCreateSelectOptions}
            disabled={isLoading}
            resetKey={isCreateModalOpen ? 'create' : 'closed'}
          />
        )}
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
          config={editFormConfig}
          initialValues={editingAttribute ? attributeToFormValues(editingAttribute) : undefined}
          resetKey={editingAttribute?.id ?? 'closed'}
          onValuesChange={(values) => {
            const nextValueType = values.valueType ?? ''
            setEditValueType(nextValueType)
            if (nextValueType !== 'select') {
              setEditSelectOptions([])
            }
          }}
          onSubmit={handleEditSubmit}
          isLoading={isLoading}
          serverError={editFormError}
        />

        {editValueType === 'select' && (
          <OptionTags
            options={editSelectOptions}
            onChange={setEditSelectOptions}
            disabled={isLoading}
            resetKey={editingAttribute?.id ?? 'closed'}
          />
        )}
      </AbzaModal>
    </>
  )
}

export function AttributesTable() {
  const [notification, setNotification] = useState<string | null>(null)

  return (
    <AttributesTableProvider onNotify={setNotification}>
      <AttributesTableContent />
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        message={notification ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </AttributesTableProvider>
  )
}
