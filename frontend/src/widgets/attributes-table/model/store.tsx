import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { useUnit } from 'effector-react'
import type { AbzaFormValues } from '@features/abza-form'
import type { AbzaTableRowId } from '@features/abza-table'
import type { AttributeDto } from '@entities/attribute'
import {
  createAttribute,
  deleteAttributesBatch,
  fetchAttributes,
  fetchLinkedProfileAttributeIds,
  isDefaultAttributeName,
  linkAttributesToProfileBatch,
  unlinkAttributesFromProfileBatch,
  updateAttribute,
} from '@entities/attribute'
import { $session, isCandidate, isRecruiterOrAdmin } from '@entities/user'
import { i18n } from '@shared/config/i18n'
import { CREATE_ATTRIBUTE_FORM_ID, EDIT_ATTRIBUTE_FORM_ID } from './constants'

type AttributesTableContextValue = {
  rows: AttributeDto[]
  totalCount: number
  page: number
  pageSize: number
  searchInput: string
  selectedIds: AbzaTableRowId[]
  isLoading: boolean
  actionError: string | null
  isCreateModalOpen: boolean
  isCreateSubmitting: boolean
  createFormError: string | null
  createValueType: string
  createSelectOptions: string[]
  isEditModalOpen: boolean
  isEditSubmitting: boolean
  editFormError: string | null
  editValueType: string
  editingAttribute: AttributeDto | null
  editSelectOptions: string[]
  linkedAttributeIds: number[]
  canManageAttributes: boolean
  canLinkToProfile: boolean
  isSelectable: boolean
  linkedAttributeIdSet: Set<number>
  hasDefaultInSelection: boolean
  unlinkableSelectedCount: number
  setSearchInput: (value: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSelectedIds: (ids: AbzaTableRowId[]) => void
  setActionError: (error: string | null) => void
  setCreateValueType: (value: string) => void
  setCreateSelectOptions: (options: string[]) => void
  setEditValueType: (value: string) => void
  setEditSelectOptions: (options: string[]) => void
  handleFilter: () => void
  handleCreateClick: () => void
  handleCreateModalClose: () => void
  handleEditModalClose: () => void
  handleCreateSubmit: (values: AbzaFormValues) => Promise<void>
  handleEditSubmit: (values: AbzaFormValues) => Promise<void>
  handleCreateModalSubmit: () => void
  handleEditModalSubmit: () => void
  handleRowClick: (row: AttributeDto) => void
  handleDeleteSelected: () => Promise<void>
  handleLinkSelected: () => Promise<void>
  handleUnlinkSelected: () => Promise<void>
}

type AttributesTableProviderProps = PropsWithChildren<{
  onNotify?: (message: string) => void
}>

const AttributesTableContext = createContext<AttributesTableContextValue | null>(null)

export function AttributesTableProvider({ children, onNotify }: AttributesTableProviderProps) {
  const { t } = useTranslation()
  const session = useUnit($session)

  const [rows, setRows] = useState<AttributeDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<AbzaTableRowId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false)
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [createValueType, setCreateValueType] = useState('')
  const [createSelectOptions, setCreateSelectOptions] = useState<string[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editValueType, setEditValueType] = useState('')
  const [editingAttribute, setEditingAttribute] = useState<AttributeDto | null>(null)
  const [editSelectOptions, setEditSelectOptions] = useState<string[]>([])
  const [linkedAttributeIds, setLinkedAttributeIds] = useState<number[]>([])

  const canManageAttributes = isRecruiterOrAdmin(session)
  const canLinkToProfile = isCandidate(session)
  const isSelectable = canLinkToProfile || canManageAttributes

  const linkedAttributeIdSet = useMemo(() => new Set(linkedAttributeIds), [linkedAttributeIds])
  const hasDefaultInSelection = useMemo(
    () => rows.some((row) => selectedIds.includes(row.id) && isDefaultAttributeName(row.name)),
    [rows, selectedIds],
  )
  const unlinkableSelectedCount = useMemo(
    () => selectedIds.filter((id) => linkedAttributeIdSet.has(Number(id))).length,
    [selectedIds, linkedAttributeIdSet],
  )

  const loadLinkedAttributeIds = useCallback(async (signal?: AbortSignal) => {
    if (!session?.id || !canLinkToProfile) {
      setLinkedAttributeIds([])
      return
    }

    try {
      const ids = await fetchLinkedProfileAttributeIds(session.id, { signal })
      if (!signal?.aborted) {
        setLinkedAttributeIds(ids)
      }
    } catch (error) {
      if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
        return
      }

      if (!signal?.aborted) {
        setLinkedAttributeIds([])
      }
    }
  }, [session?.id, canLinkToProfile])

  const loadAttributes = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setActionError(null)

    try {
      const result = await fetchAttributes(
        {
          page: page + 1,
          size: pageSize,
          search: searchQuery || undefined,
        },
        { signal },
      )

      if (!signal?.aborted) {
        setRows(result.items)
        setTotalCount(result.totalCount)
      }
    } catch (error) {
      if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
        return
      }

      if (!signal?.aborted) {
        setActionError(error instanceof Error ? error.message : i18n.t('attributes.errors.load'))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [page, pageSize, searchQuery])

  useEffect(() => {
    const controller = new AbortController()
    void loadAttributes(controller.signal)
    return () => controller.abort()
  }, [loadAttributes])

  useEffect(() => {
    const controller = new AbortController()
    void loadLinkedAttributeIds(controller.signal)
    return () => controller.abort()
  }, [loadLinkedAttributeIds])

  const handleFilter = useCallback(() => {
    setSearchQuery(searchInput.trim())
    setPage(0)
  }, [searchInput])

  const submitAttributeValues = useCallback(
    async (values: AbzaFormValues) => ({
      name: values.name,
      description: values.description || null,
      valueType: values.valueType,
      options: values.valueType === 'select' ? createSelectOptions : undefined,
    }),
    [createSelectOptions],
  )

  const handleCreateClick = useCallback(() => {
    setCreateValueType('')
    setCreateFormError(null)
    setIsCreateModalOpen(true)
  }, [])

  const handleCreateModalClose = useCallback(() => {
    if (!isCreateSubmitting) {
      setIsCreateModalOpen(false)
      setCreateFormError(null)
      setCreateValueType('')
      setCreateSelectOptions([])
    }
  }, [isCreateSubmitting])

  const handleEditModalClose = useCallback(() => {
    if (!isEditSubmitting) {
      setIsEditModalOpen(false)
      setEditingAttribute(null)
      setEditFormError(null)
      setEditValueType('')
      setEditSelectOptions([])
    }
  }, [isEditSubmitting])

  const handleCreateSubmit = useCallback(
    async (values: AbzaFormValues) => {
      setIsCreateSubmitting(true)
      setCreateFormError(null)

      try {
        await createAttribute(await submitAttributeValues(values))
        setIsCreateModalOpen(false)
        setCreateValueType('')
        setCreateSelectOptions([])
        onNotify?.(t('attributes.notifications.created'))
        await loadAttributes()
      } catch (error) {
        setCreateFormError(error instanceof Error ? error.message : t('attributes.errors.create'))
      } finally {
        setIsCreateSubmitting(false)
      }
    },
    [loadAttributes, onNotify, submitAttributeValues, t],
  )

  const handleEditSubmit = useCallback(
    async (values: AbzaFormValues) => {
      if (!editingAttribute) {
        return
      }

      setIsEditSubmitting(true)
      setEditFormError(null)

      try {
        await updateAttribute(editingAttribute.id, {
          name: values.name,
          description: values.description || null,
          valueType: values.valueType,
          options: values.valueType === 'select' ? editSelectOptions : undefined,
        })
        setIsEditModalOpen(false)
        setEditingAttribute(null)
        setEditValueType('')
        setEditSelectOptions([])
        onNotify?.(t('attributes.notifications.updated'))
        await loadAttributes()
      } catch (error) {
        setEditFormError(error instanceof Error ? error.message : t('attributes.errors.update'))
      } finally {
        setIsEditSubmitting(false)
      }
    },
    [editSelectOptions, editingAttribute, loadAttributes, onNotify, t],
  )

  const handleCreateModalSubmit = useCallback(() => {
    const form = document.getElementById(CREATE_ATTRIBUTE_FORM_ID) as HTMLFormElement | null
    form?.requestSubmit()
  }, [])

  const handleEditModalSubmit = useCallback(() => {
    const form = document.getElementById(EDIT_ATTRIBUTE_FORM_ID) as HTMLFormElement | null
    form?.requestSubmit()
  }, [])

  const handleRowClick = useCallback(
    (row: AttributeDto) => {
      if (!canManageAttributes) {
        return
      }

      if (isDefaultAttributeName(row.name)) {
        onNotify?.(t('attributes.errors.editDefault'))
        return
      }

      setEditingAttribute(row)
      setEditValueType(row.valueType)
      setEditSelectOptions(row.options ?? [])
      setEditFormError(null)
      setIsEditModalOpen(true)
    },
    [canManageAttributes, onNotify, t],
  )

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0) {
      return
    }

    const count = selectedIds.length
    setIsLoading(true)
    setActionError(null)

    try {
      await deleteAttributesBatch(selectedIds.map((id) => Number(id)))
      setSelectedIds([])
      onNotify?.(t('attributes.notifications.deleted', { count }))
      await loadAttributes()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('attributes.errors.delete'))
    } finally {
      setIsLoading(false)
    }
  }, [loadAttributes, onNotify, selectedIds, t])

  const handleLinkSelected = useCallback(async () => {
    if (!session?.id || selectedIds.length === 0) {
      return
    }

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [loadLinkedAttributeIds, onNotify, selectedIds, session?.id, t])

  const handleUnlinkSelected = useCallback(async () => {
    if (!session?.id || unlinkableSelectedCount === 0 || hasDefaultInSelection) {
      return
    }

    const idsToUnlink = selectedIds.map((id) => Number(id)).filter((id) => linkedAttributeIdSet.has(id))

    setIsLoading(true)
    setActionError(null)

    try {
      await unlinkAttributesFromProfileBatch(idsToUnlink, session.id)
      setSelectedIds([])
      onNotify?.(t('attributes.notifications.unlinked', { count: idsToUnlink.length }))
      await loadLinkedAttributeIds()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('attributes.errors.unlink'))
    } finally {
      setIsLoading(false)
    }
  }, [
    hasDefaultInSelection,
    linkedAttributeIdSet,
    loadLinkedAttributeIds,
    onNotify,
    selectedIds,
    session?.id,
    t,
    unlinkableSelectedCount,
  ])

  const value = useMemo<AttributesTableContextValue>(
    () => ({
      rows,
      totalCount,
      page,
      pageSize,
      searchInput,
      selectedIds,
      isLoading,
      actionError,
      isCreateModalOpen,
      isCreateSubmitting,
      createFormError,
      createValueType,
      createSelectOptions,
      isEditModalOpen,
      isEditSubmitting,
      editFormError,
      editValueType,
      editingAttribute,
      editSelectOptions,
      linkedAttributeIds,
      canManageAttributes,
      canLinkToProfile,
      isSelectable,
      linkedAttributeIdSet,
      hasDefaultInSelection,
      unlinkableSelectedCount,
      setSearchInput,
      setPage,
      setPageSize,
      setSelectedIds,
      setActionError,
      setCreateValueType,
      setCreateSelectOptions,
      setEditValueType,
      setEditSelectOptions,
      handleFilter,
      handleCreateClick,
      handleCreateModalClose,
      handleEditModalClose,
      handleCreateSubmit,
      handleEditSubmit,
      handleCreateModalSubmit,
      handleEditModalSubmit,
      handleRowClick,
      handleDeleteSelected,
      handleLinkSelected,
      handleUnlinkSelected,
    }),
    [
      rows,
      totalCount,
      page,
      pageSize,
      searchInput,
      selectedIds,
      isLoading,
      actionError,
      isCreateModalOpen,
      isCreateSubmitting,
      createFormError,
      createValueType,
      createSelectOptions,
      isEditModalOpen,
      isEditSubmitting,
      editFormError,
      editValueType,
      editingAttribute,
      editSelectOptions,
      linkedAttributeIds,
      canManageAttributes,
      canLinkToProfile,
      isSelectable,
      linkedAttributeIdSet,
      hasDefaultInSelection,
      unlinkableSelectedCount,
      handleFilter,
      handleCreateClick,
      handleCreateModalClose,
      handleEditModalClose,
      handleCreateSubmit,
      handleEditSubmit,
      handleCreateModalSubmit,
      handleEditModalSubmit,
      handleRowClick,
      handleDeleteSelected,
      handleLinkSelected,
      handleUnlinkSelected,
    ],
  )

  return <AttributesTableContext.Provider value={value}>{children}</AttributesTableContext.Provider>
}

export function useAttributesTable() {
  const context = useContext(AttributesTableContext)

  if (!context) {
    throw new Error('useAttributesTable must be used within AttributesTableProvider')
  }

  return context
}
