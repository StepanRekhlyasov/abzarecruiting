import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import { i18n } from '@shared/config/i18n'
import { formatDateTime } from '@shared/lib/date'
import { AbzaError } from '@features/abza-error'
import { AbzaModal } from '@features/abza-modal'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import { AbzaTableToolbar } from '@features/abza-table-toolbar'
import type { AttributeDto } from '@entities/attribute'
import {
  AttributesTableProvider,
  attributeToFormValues,
  attributeToValidations,
  useAttributesTable,
} from '../model'
import { AttributeForm } from './AttributeForm'
import { AttributesFilterModal } from './FilterModal'
import { LinkToProfileModal } from './LinkToProfileModal'

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
    isEditModalOpen,
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
    canLinkToCandidateProfile,
    unlinkableSelectedCount,
    isFilterActive,
    setIsFilterModalOpen,
    handleCreateClick,
    handleDeleteSelected,
    handleLinkSelected,
    handleUnlinkSelected,
    handleOpenLinkToProfileModal,
    handleOpenUnlinkFromProfileModal,
    loadAttributeOptions,
    createFormRef,
    editFormRef,
  } = useAttributesTable()

  const canUseProfileActions = canLinkToProfile || canLinkToCandidateProfile

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
        render: (row) => row.description,
      },
      {
        id: 'category',
        label: t('attributes.columns.category'),
        sortable: true,
        render: (row) => t(`attributes.categories.${row.category}`, row.category),
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
        toolbar={
          <AbzaTableToolbar
            disabled={isLoading}
            asyncTagsSearch={{
              label: t('attributes.search'),
              value: searchTags,
              onChange: setSearchTags,
              loadOptions: loadAttributeOptions,
              allowCreate: true,
              createOptionLabel: (name) => t('attributes.searchAdd', { name }),
            }}
            filter={{
              active: isFilterActive,
              onClick: () => setIsFilterModalOpen(true),
              'aria-label': t('attributes.actions.filter'),
            }}
            create={canManageAttributes ? { onClick: handleCreateClick } : undefined}
            delete={
              canManageAttributes
                ? {
                    onClick: handleDeleteSelected,
                    disabled: selectedIds.length === 0,
                  }
                : undefined
            }
            link={
              canUseProfileActions
                ? {
                    onClick: canLinkToCandidateProfile
                      ? handleOpenLinkToProfileModal
                      : () => void handleLinkSelected(),
                    disabled: selectedIds.length === 0,
                    title: t('attributes.actions.linkSelected'),
                    'aria-label': t('attributes.actions.linkSelected'),
                  }
                : undefined
            }
            unlink={
              canUseProfileActions
                ? {
                    onClick: canLinkToCandidateProfile
                      ? handleOpenUnlinkFromProfileModal
                      : () => void handleUnlinkSelected(),
                    disabled: canLinkToCandidateProfile
                      ? selectedIds.length === 0
                      : unlinkableSelectedCount === 0,
                    title: t('attributes.actions.unlinkSelected'),
                    'aria-label': t('attributes.actions.unlinkSelected'),
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
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateModalSubmit}
        isLoading={isLoading}
      >
        <AttributeForm
          key={isCreateModalOpen ? 'create-open' : 'create-closed'}
          formRef={createFormRef}
          onSubmit={handleCreateSubmit}
          isLoading={isLoading}
        />
      </AbzaModal>

      <AbzaModal
        open={isEditModalOpen}
        config={{
          title: t('attributes.edit.title'),
          submitLabel: t('attributes.edit.submit'),
          cancelLabel: t('attributes.edit.cancel'),
        }}
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleEditModalSubmit}
        isLoading={isLoading}
      >
        {editingAttribute ? (
          <AttributeForm
            key={editingAttribute.id}
            formRef={editFormRef}
            initialValues={attributeToFormValues(editingAttribute)}
            initialValidations={attributeToValidations(editingAttribute)}
            onSubmit={handleEditSubmit}
            isLoading={isLoading}
          />
        ) : null}
      </AbzaModal>

      <LinkToProfileModal />
      <AttributesFilterModal />
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
