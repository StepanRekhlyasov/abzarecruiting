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
import { isAxiosError } from 'axios'
import { useUnit } from 'effector-react'
import type { AbzaFormValues } from '@features/abza-form'
import type { AbzaTableRowId } from '@features/abza-table'
import type { AttributeDto } from '@entities/attribute'
import type { SortDirection } from '@shared/types'
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
import { getErrorKey } from '@shared/lib/errors'
import {
  toSubmitNullableString,
  toSubmitStringArray,
  toSubmitValues,
} from '@shared/lib/helpers'

function toAttributeSubmitValues(values: AbzaFormValues) {
  const { name, valueType } = toSubmitValues(values, ['name', 'valueType'])

  return {
    name,
    description: toSubmitNullableString(values, 'description'),
    valueType,
    options: valueType === 'select' ? toSubmitStringArray(values, 'options') : undefined,
  }
}

type AttributesTableContextValue = {
  rows: AttributeDto[]
  totalCount: number
  page: number
  pageSize: number
  searchInput: string
  sortBy: string
  sortDir: SortDirection
  selectedIds: AbzaTableRowId[]
  isLoading: boolean
  actionError: string | null
  isCreateModalOpen: boolean
  isEditModalOpen: boolean
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
  setIsCreateModalOpen: (open: boolean) => void
  setIsEditModalOpen: (open: boolean) => void
  setActionError: (error: string | null) => void
  handleSortChange: (nextSortBy: string, nextSortDir: SortDirection) => void
  handleFilter: () => void
  handleCreateClick: () => void
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
  const session = useUnit($session)
  const createFormRef = useRef<HTMLFormElement>(null)
  const editFormRef = useRef<HTMLFormElement>(null)

  const [rows, setRows] = useState<AttributeDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<AbzaTableRowId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
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
          sortBy,
          sortDir,
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
        setActionError(getErrorKey(error, 'error.attributes.load'))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [page, pageSize, searchQuery, sortBy, sortDir])

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

  useEffect(() => {
    if (!isEditModalOpen) {
      setEditingAttribute(null)
    }
  }, [isEditModalOpen])

  const handleFilter = useCallback(() => {
    setSearchQuery(searchInput.trim())
    setPage(0)
  }, [searchInput])

  const handleSortChange = useCallback((nextSortBy: string, nextSortDir: SortDirection) => {
    setSortBy(nextSortBy)
    setSortDir(nextSortDir)
    setPage(0)
  }, [])

  const handleCreateClick = useCallback(() => {
    setIsCreateModalOpen(true)
  }, [])

  const handleCreateSubmit = useCallback(
    async (values: AbzaFormValues) => {
      setIsLoading(true)

      try {
        await createAttribute(toAttributeSubmitValues(values))
        setIsCreateModalOpen(false)
        await loadAttributes()
      } finally {
        setIsLoading(false)
      }
    },
    [loadAttributes],
  )

  const handleEditSubmit = useCallback(
    async (values: AbzaFormValues) => {
      if (!editingAttribute) {
        return
      }

      setIsLoading(true)

      try {
        const updated = await updateAttribute(editingAttribute.id, {
          ...toAttributeSubmitValues(values),
          version: editingAttribute.version,
        })
        setRows((currentRows) =>
          currentRows.map((row) => (row.id === updated.id ? updated : row)),
        )
        setIsEditModalOpen(false)
      } finally {
        setIsLoading(false)
      }
    },
    [editingAttribute],
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
      setIsEditModalOpen(true)
    },
    [canManageAttributes],
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
      setActionError(getErrorKey(error, 'error.attributes.delete'))
    } finally {
      setIsLoading(false)
    }
  }, [rows, selectedIds])

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
      setActionError(getErrorKey(error, 'error.attributes.link'))
    } finally {
      setIsLoading(false)
    }
  }, [loadLinkedAttributeIds, selectedIds, session?.id])

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
      setActionError(getErrorKey(error, 'error.attributes.unlink'))
    } finally {
      setIsLoading(false)
    }
  }, [
    linkedAttributeIdSet,
    loadLinkedAttributeIds,
    selectedIds,
    session?.id,
  ])

  const value = useMemo<AttributesTableContextValue>(
    () => ({
      rows,
      totalCount,
      page,
      pageSize,
      searchInput,
      sortBy,
      sortDir,
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
      createFormRef,
      editFormRef,
      setSearchInput,
      setPage,
      setPageSize,
      setSelectedIds,
      setIsCreateModalOpen,
      setIsEditModalOpen,
      setActionError,
      handleSortChange,
      handleFilter,
      handleCreateClick,
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
      sortBy,
      sortDir,
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
      handleSortChange,
      handleFilter,
      handleCreateClick,
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
