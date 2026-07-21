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
import type { AttributeCategory, AttributeDto, AttributeValidationRequest } from '@entities/attribute'
import type { AbzaSelectOption, AsyncEntityLoadOptions, SortDirection } from '@shared/types'
import {
  createAttribute,
  deleteAttributesBatch,
  fetchAttributes,
  fetchLinkedProfileAttributeIds,
  linkAttributesToProfileBatch,
  loadAttributeOptions as fetchAttributeOptions,
  unlinkAttributesFromProfileBatch,
  updateAttribute,
} from '@entities/attribute'
import {
  $session,
  isAdmin,
  isCandidate,
  isRecruiterOrAdmin,
  loadCandidateOptions as fetchCandidateOptions,
} from '@entities/user'
import { getErrorKey } from '@shared/lib/errors'
import {
  toSubmitNullableString,
  toSubmitStringArray,
  toSubmitValues,
} from '@shared/lib/helpers'
import { NEW_TAG_VALUE_PREFIX } from '@shared/ui/inputs'

function toAttributeSubmitValues(values: AbzaFormValues, validations: AttributeValidationRequest[]) {
  const { name, valueType, category } = toSubmitValues(values, ['name', 'valueType', 'category'])

  return {
    name,
    description: toSubmitNullableString(values, 'description'),
    category: category as AttributeCategory,
    valueType,
    options: valueType === 'select' ? toSubmitStringArray(values, 'options') : undefined,
    validations,
  }
}

function isSearchTextTag(option: AbzaSelectOption) {
  return Boolean(option.isNew) || option.value.startsWith(NEW_TAG_VALUE_PREFIX)
}

export type AttributeTableFilters = {
  category: string
  valueType: string
}

const EMPTY_FILTERS: AttributeTableFilters = {
  category: '',
  valueType: '',
}

type AttributesTableContextValue = {
  rows: AttributeDto[]
  totalCount: number
  page: number
  pageSize: number
  searchTags: AbzaSelectOption[]
  sortBy: string
  sortDir: SortDirection
  selectedIds: AbzaTableRowId[]
  isLoading: boolean
  actionError: string | null
  isCreateModalOpen: boolean
  isEditModalOpen: boolean
  isFilterModalOpen: boolean
  editingAttribute: AttributeDto | null
  canManageAttributes: boolean
  canLinkToProfile: boolean
  canLinkToCandidateProfile: boolean
  isSelectable: boolean
  linkedAttributeIdSet: Set<number>
  unlinkableSelectedCount: number
  appliedFilters: AttributeTableFilters
  isFilterActive: boolean
  isLinkToProfileModalOpen: boolean
  linkToProfileModalMode: 'link' | 'unlink'
  linkCandidate: AbzaSelectOption | null
  createFormRef: RefObject<HTMLFormElement | null>
  editFormRef: RefObject<HTMLFormElement | null>
  setSearchTags: (value: AbzaSelectOption[]) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSelectedIds: (ids: AbzaTableRowId[]) => void
  setIsCreateModalOpen: (open: boolean) => void
  setIsEditModalOpen: (open: boolean) => void
  setIsFilterModalOpen: (open: boolean) => void
  setIsLinkToProfileModalOpen: (open: boolean) => void
  setLinkCandidate: (candidate: AbzaSelectOption | null) => void
  setActionError: (error: string | null) => void
  handleSortChange: (nextSortBy: string, nextSortDir: SortDirection) => void
  handleApplyFilters: (filters: AttributeTableFilters) => void
  handleResetFilters: () => void
  handleCreateClick: () => void
  handleCreateSubmit: (values: AbzaFormValues, validations: AttributeValidationRequest[]) => Promise<void>
  handleEditSubmit: (values: AbzaFormValues, validations: AttributeValidationRequest[]) => Promise<void>
  handleCreateModalSubmit: () => void
  handleEditModalSubmit: () => void
  handleRowClick: (row: AttributeDto) => void
  handleDeleteSelected: () => Promise<void>
  handleLinkSelected: () => Promise<void>
  handleUnlinkSelected: () => Promise<void>
  handleOpenLinkToProfileModal: () => void
  handleOpenUnlinkFromProfileModal: () => void
  handleLinkToCandidateSubmit: () => Promise<void>
  loadAttributeOptions: AsyncEntityLoadOptions
  loadCandidateOptions: AsyncEntityLoadOptions
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
  const [searchTags, setSearchTagsState] = useState<AbzaSelectOption[]>([])
  const [appliedFilters, setAppliedFilters] = useState<AttributeTableFilters>(EMPTY_FILTERS)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<AbzaTableRowId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isLinkToProfileModalOpen, setIsLinkToProfileModalOpen] = useState(false)
  const [linkToProfileModalMode, setLinkToProfileModalMode] = useState<'link' | 'unlink'>('link')
  const [linkCandidate, setLinkCandidate] = useState<AbzaSelectOption | null>(null)
  const [editingAttribute, setEditingAttribute] = useState<AttributeDto | null>(null)
  const [linkedAttributeIds, setLinkedAttributeIds] = useState<number[]>([])

  const canManageAttributes = isRecruiterOrAdmin(session)
  const canLinkToProfile = isCandidate(session)
  const canLinkToCandidateProfile = isAdmin(session)
  const isSelectable = canLinkToProfile || canManageAttributes || canLinkToCandidateProfile
  const isFilterActive = Boolean(appliedFilters.category || appliedFilters.valueType)

  const linkedAttributeIdSet = useMemo(() => new Set(linkedAttributeIds), [linkedAttributeIds])

  const unlinkableSelectedCount = useMemo(
    () => selectedIds.filter((id) => linkedAttributeIdSet.has(Number(id))).length,
    [linkedAttributeIdSet, selectedIds],
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

  const loadAttributeOptions = useCallback(
    (search: string, signal?: AbortSignal, page = 1) => fetchAttributeOptions(search, signal, page),
    [],
  )

  const loadCandidateOptions = useCallback(
    (search: string, signal?: AbortSignal, page = 1) => fetchCandidateOptions(search, signal, page),
    [],
  )

  const loadAttributes = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setActionError(null)

    const ids = searchTags
      .filter((tag) => !isSearchTextTag(tag))
      .map((tag) => Number(tag.value))
      .filter((id) => Number.isFinite(id) && id > 0)

    const searches = searchTags
      .filter((tag) => isSearchTextTag(tag))
      .map((tag) => tag.label.trim())
      .filter(Boolean)

    try {
      const result = await fetchAttributes(
        {
          page: page + 1,
          size: pageSize,
          ids: ids.length > 0 ? ids : undefined,
          searches: searches.length > 0 ? searches : undefined,
          category: appliedFilters.category || undefined,
          valueType: appliedFilters.valueType || undefined,
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
  }, [page, pageSize, searchTags, appliedFilters, sortBy, sortDir])

  const setSearchTags = useCallback((value: AbzaSelectOption[]) => {
    setSearchTagsState(value)
    setPage(0)
  }, [])

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

  useEffect(() => {
    if (!isLinkToProfileModalOpen) {
      setLinkCandidate(null)
    }
  }, [isLinkToProfileModalOpen])

  const handleApplyFilters = useCallback((filters: AttributeTableFilters) => {
    setAppliedFilters({
      category: filters.category.trim(),
      valueType: filters.valueType.trim(),
    })
    setIsFilterModalOpen(false)
    setPage(0)
  }, [])

  const handleResetFilters = useCallback(() => {
    setAppliedFilters(EMPTY_FILTERS)
    setIsFilterModalOpen(false)
    setPage(0)
  }, [])

  const handleSortChange = useCallback((nextSortBy: string, nextSortDir: SortDirection) => {
    setSortBy(nextSortBy)
    setSortDir(nextSortDir)
    setPage(0)
  }, [])

  const handleCreateClick = useCallback(() => {
    setIsCreateModalOpen(true)
  }, [])

  const handleCreateSubmit = useCallback(
    async (values: AbzaFormValues, validations: AttributeValidationRequest[]) => {
      setIsLoading(true)

      try {
        await createAttribute(toAttributeSubmitValues(values, validations))
        setIsCreateModalOpen(false)
        await loadAttributes()
      } finally {
        setIsLoading(false)
      }
    },
    [loadAttributes],
  )

  const handleEditSubmit = useCallback(
    async (values: AbzaFormValues, validations: AttributeValidationRequest[]) => {
      if (!editingAttribute) {
        return
      }

      setIsLoading(true)

      try {
        const updated = await updateAttribute(editingAttribute.id, {
          ...toAttributeSubmitValues(values, validations),
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

  const handleOpenLinkToProfileModal = useCallback(() => {
    if (!canLinkToCandidateProfile || selectedIds.length === 0) {
      return
    }

    setActionError(null)
    setLinkToProfileModalMode('link')
    setIsLinkToProfileModalOpen(true)
  }, [canLinkToCandidateProfile, selectedIds.length])

  const handleOpenUnlinkFromProfileModal = useCallback(() => {
    if (!canLinkToCandidateProfile || selectedIds.length === 0) {
      return
    }

    setActionError(null)
    setLinkToProfileModalMode('unlink')
    setIsLinkToProfileModalOpen(true)
  }, [canLinkToCandidateProfile, selectedIds.length])

  const handleLinkToCandidateSubmit = useCallback(async () => {
    if (!linkCandidate?.value || selectedIds.length === 0) {
      return
    }

    const attributeIds = selectedIds.map((id) => Number(id))

    setIsLoading(true)
    setActionError(null)

    try {
      if (linkToProfileModalMode === 'unlink') {
        await unlinkAttributesFromProfileBatch(attributeIds, linkCandidate.value)
      } else {
        await linkAttributesToProfileBatch(attributeIds, linkCandidate.value)
      }

      setSelectedIds([])
      setIsLinkToProfileModalOpen(false)
    } catch (error) {
      setActionError(
        getErrorKey(
          error,
          linkToProfileModalMode === 'unlink' ? 'error.attributes.unlink' : 'error.attributes.link',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [linkCandidate?.value, linkToProfileModalMode, selectedIds])

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
      searchTags,
      sortBy,
      sortDir,
      selectedIds,
      isLoading,
      actionError,
      isCreateModalOpen,
      isEditModalOpen,
      isFilterModalOpen,
      isLinkToProfileModalOpen,
      linkToProfileModalMode,
      linkCandidate,
      editingAttribute,
      canManageAttributes,
      canLinkToProfile,
      canLinkToCandidateProfile,
      isSelectable,
      linkedAttributeIdSet,
      unlinkableSelectedCount,
      appliedFilters,
      isFilterActive,
      createFormRef,
      editFormRef,
      setSearchTags,
      setPage,
      setPageSize,
      setSelectedIds,
      setIsCreateModalOpen,
      setIsEditModalOpen,
      setIsFilterModalOpen,
      setIsLinkToProfileModalOpen,
      setLinkCandidate,
      setActionError,
      handleSortChange,
      handleApplyFilters,
      handleResetFilters,
      handleCreateClick,
      handleCreateSubmit,
      handleEditSubmit,
      handleCreateModalSubmit,
      handleEditModalSubmit,
      handleRowClick,
      handleDeleteSelected,
      handleLinkSelected,
      handleUnlinkSelected,
      handleOpenLinkToProfileModal,
      handleOpenUnlinkFromProfileModal,
      handleLinkToCandidateSubmit,
      loadAttributeOptions,
      loadCandidateOptions,
    }),
    [
      rows,
      totalCount,
      page,
      pageSize,
      searchTags,
      sortBy,
      sortDir,
      selectedIds,
      isLoading,
      actionError,
      isCreateModalOpen,
      isEditModalOpen,
      isFilterModalOpen,
      isLinkToProfileModalOpen,
      linkToProfileModalMode,
      linkCandidate,
      editingAttribute,
      canManageAttributes,
      canLinkToProfile,
      canLinkToCandidateProfile,
      isSelectable,
      linkedAttributeIdSet,
      unlinkableSelectedCount,
      appliedFilters,
      isFilterActive,
      setSearchTags,
      handleSortChange,
      handleApplyFilters,
      handleResetFilters,
      handleCreateClick,
      handleCreateSubmit,
      handleEditSubmit,
      handleCreateModalSubmit,
      handleEditModalSubmit,
      handleRowClick,
      handleDeleteSelected,
      handleLinkSelected,
      handleUnlinkSelected,
      handleOpenLinkToProfileModal,
      handleOpenUnlinkFromProfileModal,
      handleLinkToCandidateSubmit,
      loadAttributeOptions,
      loadCandidateOptions,
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
