import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject,
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
  linkAttributesToProfileBatch,
  unlinkAttributesFromProfileBatch,
  updateAttribute,
} from '@entities/attribute'
import { $session, isCandidate, isRecruiterOrAdmin } from '@entities/user'
import { i18n } from '@shared/config/i18n'

function toSubmitValues(values: AbzaFormValues) {
  const valueType = typeof values.valueType === 'string' ? values.valueType : ''

  return {
    name: typeof values.name === 'string' ? values.name : '',
    description: (typeof values.description === 'string' ? values.description : '') || null,
    valueType,
    options: valueType === 'select' && Array.isArray(values.options) ? values.options : undefined,
  }
}

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
  createFormError: string | null
  isEditModalOpen: boolean
  editFormError: string | null
  editingAttribute: AttributeDto | null
  canManageAttributes: boolean
  canLinkToProfile: boolean
  isSelectable: boolean
  linkedAttributeIdSet: Set<number>
  createFormRef: RefObject<HTMLFormElement | null>
  editFormRef: RefObject<HTMLFormElement | null>
  setSearchInput: (value: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSelectedIds: (ids: AbzaTableRowId[]) => void
  setActionError: (error: string | null) => void
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

const AttributesTableContext = createContext<AttributesTableContextValue | null>(null)

export function AttributesTableProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation()
  const session = useUnit($session)
  const createFormRef = useRef<HTMLFormElement>(null)
  const editFormRef = useRef<HTMLFormElement>(null)

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
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editingAttribute, setEditingAttribute] = useState<AttributeDto | null>(null)
  const [linkedAttributeIds, setLinkedAttributeIds] = useState<number[]>([])

  const canManageAttributes = isRecruiterOrAdmin(session)
  const canLinkToProfile = isCandidate(session)
  const isSelectable = canLinkToProfile || canManageAttributes

  const linkedAttributeIdSet = useMemo(() => new Set(linkedAttributeIds), [linkedAttributeIds])

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

  const handleCreateClick = useCallback(() => {
    setCreateFormError(null)
    setIsCreateModalOpen(true)
  }, [])

  const handleCreateModalClose = useCallback(() => {
    if (!isLoading) {
      setIsCreateModalOpen(false)
      setCreateFormError(null)
    }
  }, [isLoading])

  const handleEditModalClose = useCallback(() => {
    if (!isLoading) {
      setIsEditModalOpen(false)
      setEditingAttribute(null)
      setEditFormError(null)
    }
  }, [isLoading])

  const handleCreateSubmit = useCallback(
    async (values: AbzaFormValues) => {
      setIsLoading(true)
      setCreateFormError(null)

      try {
        await createAttribute(toSubmitValues(values))
        setIsCreateModalOpen(false)
        await loadAttributes()
      } catch (error) {
        setCreateFormError(error instanceof Error ? error.message : t('attributes.errors.create'))
      } finally {
        setIsLoading(false)
      }
    },
    [loadAttributes, t],
  )

  const handleEditSubmit = useCallback(
    async (values: AbzaFormValues) => {
      if (!editingAttribute) {
        return
      }

      setIsLoading(true)
      setEditFormError(null)

      try {
        const updated = await updateAttribute(editingAttribute.id, {
          ...toSubmitValues(values),
          version: editingAttribute.version,
        })
        setRows((currentRows) =>
          currentRows.map((row) => (row.id === updated.id ? updated : row)),
        )
        setIsEditModalOpen(false)
        setEditingAttribute(null)
      } catch (error) {
        setEditFormError(error instanceof Error ? error.message : t('attributes.errors.update'))
      } finally {
        setIsLoading(false)
      }
    },
    [editingAttribute, t],
  )

  const handleCreateModalSubmit = useCallback(() => {
    createFormRef.current?.requestSubmit()
  }, [])

  const handleEditModalSubmit = useCallback(() => {
    editFormRef.current?.requestSubmit()
  }, [])

  const handleRowClick = useCallback(
    (row: AttributeDto) => {
      if (!canManageAttributes) {
        return
      }

      setEditingAttribute(row)
      setEditFormError(null)
      setIsEditModalOpen(true)
    },
    [canManageAttributes, t],
  )

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0) {
      return
    }

    const count = selectedIds.length
    setIsLoading(true)
    setActionError(null)

    try {
      const items = selectedIds.map((id) => {
        const row = rows.find((item) => item.id === Number(id))
        return { id: Number(id), version: row?.version ?? 0 }
      })

      await deleteAttributesBatch(items)
      const deletedIds = new Set(items.map((item) => item.id))
      setRows((currentRows) => currentRows.filter((row) => !deletedIds.has(row.id)))
      setTotalCount((currentTotal) => Math.max(0, currentTotal - count))
      setSelectedIds([])
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('attributes.errors.delete'))
    } finally {
      setIsLoading(false)
    }
  }, [rows, selectedIds, t])  

  const handleLinkSelected = useCallback(async () => {
    if (!session?.id || selectedIds.length === 0) {
      return
    }

    setIsLoading(true)
    setActionError(null)

    try {
      await linkAttributesToProfileBatch(selectedIds.map((id) => Number(id)), session.id)
      setSelectedIds([])
      await loadLinkedAttributeIds()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('attributes.errors.link'))
    } finally {
      setIsLoading(false)
    }
  }, [loadLinkedAttributeIds, selectedIds, session?.id, t])

  const handleUnlinkSelected = useCallback(async () => {
    if (!session?.id) {
      return
    }

    const idsToUnlink = selectedIds.map((id) => Number(id)).filter((id) => linkedAttributeIdSet.has(id))

    setIsLoading(true)
    setActionError(null)

    try {
      await unlinkAttributesFromProfileBatch(idsToUnlink, session.id)
      setSelectedIds([])
      await loadLinkedAttributeIds()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('attributes.errors.unlink'))
    } finally {
      setIsLoading(false)
    }
  }, [
    linkedAttributeIdSet,
    loadLinkedAttributeIds,
    selectedIds,
    session?.id,
    t,
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
      createFormError,
      isEditModalOpen,  
      editFormError,
      editingAttribute,
      canManageAttributes,
      canLinkToProfile,
      isSelectable,
      linkedAttributeIdSet,
      createFormRef,
      editFormRef,
      setSearchInput,
      setPage,
      setPageSize,
      setSelectedIds,
      setActionError,
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
      createFormError,
      isEditModalOpen,
      editFormError,
      editingAttribute,
      canManageAttributes,
      canLinkToProfile,
      isSelectable,
      linkedAttributeIdSet,
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
