import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnit } from 'effector-react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import { $session } from '@features/auth'
import {
  createAttribute,
  createAttributeFormConfig,
  deleteAttributesBatch,
  fetchAttributes,
  fetchLinkedProfileAttributeIds,
  linkAttributesToProfileBatch,
  unlinkAttributesFromProfileBatch,
  updateAttribute,
} from '@features/attribute'
import type { AttributeDto } from '@entities/attribute'
import { isDefaultAttributeName } from '@entities/attribute'
import { isCandidate, isRecruiterOrAdmin } from '@entities/user'
import { AbzaForm, type AbzaFormValues } from '@widgets/abza-form'
import { AbzaModal } from '@widgets/abza-modal'
import { AbzaTable } from '@widgets/abza-table'
import type { AbzaTableColumn, AbzaTableRowId } from '@widgets/abza-table'

const CREATE_ATTRIBUTE_FORM_ID = 'create-attribute-form'
const EDIT_ATTRIBUTE_FORM_ID = 'edit-attribute-form'

type AttributesTableProps = {
  onNotify?: (message: string) => void
}

function attributeToFormValues(attribute: AttributeDto): AbzaFormValues {
  return {
    name: attribute.name,
    description: attribute.description ?? '',
    valueType: attribute.valueType,
    inputType: attribute.inputType,
  }
}

export function AttributesTable({ onNotify }: AttributesTableProps) {
  const { t } = useTranslation()
  const session = useUnit($session)

  const [rows, setRows] = useState<AttributeDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<AbzaTableRowId[]>([])
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false)
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [createValueType, setCreateValueType] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editValueType, setEditValueType] = useState('')
  const [editingAttribute, setEditingAttribute] = useState<AttributeDto | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [linkedAttributeIds, setLinkedAttributeIds] = useState<number[]>([])

  const canManageAttributes = isRecruiterOrAdmin(session)
  const canLinkToProfile = isCandidate(session)
  const isSelectable = canLinkToProfile || canManageAttributes

  const createFormConfig = useMemo(() => createAttributeFormConfig(t, createValueType), [t, createValueType])
  const editFormConfig = useMemo(() => createAttributeFormConfig(t, editValueType), [t, editValueType])
  const linkedAttributeIdSet = useMemo(() => new Set(linkedAttributeIds), [linkedAttributeIds])
  const hasDefaultInSelection = useMemo(
    () => rows.some((row) => selectedIds.includes(row.id) && isDefaultAttributeName(row.name)),
    [rows, selectedIds],
  )
  const unlinkableSelectedCount = useMemo(
    () => selectedIds.filter((id) => linkedAttributeIdSet.has(Number(id))).length,
    [selectedIds, linkedAttributeIdSet],
  )

  const loadLinkedAttributeIds = useCallback(async () => {
    if (!session?.id || !canLinkToProfile) {
      setLinkedAttributeIds([])
      return
    }

    try {
      const ids = await fetchLinkedProfileAttributeIds(session.id)
      setLinkedAttributeIds(ids)
    } catch {
      setLinkedAttributeIds([])
    }
  }, [session?.id, canLinkToProfile])

  const loadAttributes = useCallback(async () => {
    setLoading(true)
    setActionError(null)

    try {
      const result = await fetchAttributes({
        page: page + 1,
        size: pageSize,
        name: searchQuery || undefined,
      })

      setRows(result.items)
      setTotalCount(result.totalCount)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('attributes.errors.load'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchQuery, t])

  useEffect(() => {
    void loadAttributes()
  }, [loadAttributes])

  useEffect(() => {
    void loadLinkedAttributeIds()
  }, [loadLinkedAttributeIds])

  const handleFilter = () => {
    setSearchQuery(searchInput.trim())
    setPage(0)
  }

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

  const submitAttributeValues = async (values: AbzaFormValues) => ({
    name: values.name,
    description: values.description || null,
    valueType: values.valueType,
    inputType: values.inputType,
  })

  const handleCreateSubmit = async (values: AbzaFormValues) => {
    setIsCreateSubmitting(true)
    setCreateFormError(null)

    try {
      await createAttribute(await submitAttributeValues(values))
      setIsCreateModalOpen(false)
      setCreateValueType('')
      onNotify?.(t('attributes.notifications.created'))
      await loadAttributes()
    } catch (error) {
      setCreateFormError(error instanceof Error ? error.message : t('attributes.errors.create'))
    } finally {
      setIsCreateSubmitting(false)
    }
  }

  const handleEditSubmit = async (values: AbzaFormValues) => {
    if (!editingAttribute) {
      return
    }

    setIsEditSubmitting(true)
    setEditFormError(null)

    try {
      await updateAttribute(editingAttribute.id, await submitAttributeValues(values))
      setIsEditModalOpen(false)
      setEditingAttribute(null)
      setEditValueType('')
      onNotify?.(t('attributes.notifications.updated'))
      await loadAttributes()
    } catch (error) {
      setEditFormError(error instanceof Error ? error.message : t('attributes.errors.update'))
    } finally {
      setIsEditSubmitting(false)
    }
  }

  const handleCreateModalSubmit = () => {
    const form = document.getElementById(CREATE_ATTRIBUTE_FORM_ID) as HTMLFormElement | null
    form?.requestSubmit()
  }

  const handleEditModalSubmit = () => {
    const form = document.getElementById(EDIT_ATTRIBUTE_FORM_ID) as HTMLFormElement | null
    form?.requestSubmit()
  }

  const handleRowClick = (row: AttributeDto) => {
    if (!canManageAttributes) {
      return
    }

    if (isDefaultAttributeName(row.name)) {
      onNotify?.(t('attributes.errors.editDefault'))
      return
    }

    setEditingAttribute(row)
    setEditValueType(row.valueType)
    setEditFormError(null)
    setIsEditModalOpen(true)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      return
    }

    const count = selectedIds.length
    setIsDeleting(true)
    setActionError(null)

    try {
      await deleteAttributesBatch(selectedIds.map((id) => Number(id)))
      setSelectedIds([])
      onNotify?.(t('attributes.notifications.deleted', { count }))
      await loadAttributes()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('attributes.errors.delete'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLinkSelected = async () => {
    if (!session?.id || selectedIds.length === 0) {
      return
    }

    setIsLinking(true)
    setActionError(null)

    try {
      const count = selectedIds.length
      await linkAttributesToProfileBatch(selectedIds.map((id) => Number(id)), session.id)
      setSelectedIds([])
      onNotify?.(t('attributes.notifications.linked', { count }))
      await loadLinkedAttributeIds()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('attributes.errors.link'))
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkSelected = async () => {
    if (!session?.id || unlinkableSelectedCount === 0 || hasDefaultInSelection) {
      return
    }

    const idsToUnlink = selectedIds.map((id) => Number(id)).filter((id) => linkedAttributeIdSet.has(id))

    setIsUnlinking(true)
    setActionError(null)

    try {
      await unlinkAttributesFromProfileBatch(idsToUnlink, session.id)
      setSelectedIds([])
      onNotify?.(t('attributes.notifications.unlinked', { count: idsToUnlink.length }))
      await loadLinkedAttributeIds()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('attributes.errors.unlink'))
    } finally {
      setIsUnlinking(false)
    }
  }

  const toolbar = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
      <TextField
        size="small"
        label={t('attributes.search')}
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            handleFilter()
          }
        }}
        sx={{ minWidth: 260, flexGrow: 1 }}
      />
      <Button variant="outlined" onClick={handleFilter} disabled={loading}>
        {t('attributes.actions.filter')}
      </Button>
      {canManageAttributes && (
        <Button
          variant="contained"
          onClick={() => {
            setCreateValueType('')
            setCreateFormError(null)
            setIsCreateModalOpen(true)
          }}
        >
          {t('attributes.actions.add')}
        </Button>
      )}
      {canManageAttributes && (
        <Button
          variant="outlined"
          color="error"
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0 || isDeleting}
        >
          {t('attributes.actions.deleteSelected')}
        </Button>
      )}
      {canLinkToProfile && (
        <Button
          variant="contained"
          onClick={handleLinkSelected}
          disabled={selectedIds.length === 0 || isLinking}
        >
          {t('attributes.actions.linkSelected')}
        </Button>
      )}
      {canLinkToProfile && (
        <Button
          variant="outlined"
          color="error"
          onClick={handleUnlinkSelected}
          disabled={unlinkableSelectedCount === 0 || isUnlinking || hasDefaultInSelection}
        >
          {t('attributes.actions.unlinkSelected')}
        </Button>
      )}
    </Box>
  )

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
        toolbar={toolbar}
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
        loading={loading}
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
        onClose={() => {
          if (!isCreateSubmitting) {
            setIsCreateModalOpen(false)
            setCreateFormError(null)
            setCreateValueType('')
          }
        }}
        onSubmit={handleCreateModalSubmit}
        isSubmitting={isCreateSubmitting}
      >
        <AbzaForm
          formId={CREATE_ATTRIBUTE_FORM_ID}
          hideSubmitButton
          config={createFormConfig}
          resetKey={isCreateModalOpen ? 'create' : 'closed'}
          onValuesChange={(values) => setCreateValueType(values.valueType ?? '')}
          onSubmit={handleCreateSubmit}
          isSubmitting={isCreateSubmitting}
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
        onClose={() => {
          if (!isEditSubmitting) {
            setIsEditModalOpen(false)
            setEditingAttribute(null)
            setEditFormError(null)
            setEditValueType('')
          }
        }}
        onSubmit={handleEditModalSubmit}
        isSubmitting={isEditSubmitting}
      >
        <AbzaForm
          formId={EDIT_ATTRIBUTE_FORM_ID}
          hideSubmitButton
          config={editFormConfig}
          initialValues={editingAttribute ? attributeToFormValues(editingAttribute) : undefined}
          resetKey={editingAttribute?.id ?? 'closed'}
          onValuesChange={(values) => setEditValueType(values.valueType ?? '')}
          onSubmit={handleEditSubmit}
          isSubmitting={isEditSubmitting}
          serverError={editFormError}
        />
      </AbzaModal>
    </>
  )
}

export function AttributesTableWithNotifications() {
  const [notification, setNotification] = useState<string | null>(null)

  return (
    <>
      <AttributesTable onNotify={setNotification} />
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        message={notification ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  )
}
