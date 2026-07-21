import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { isAxiosError } from 'axios'
import { useSearchParams } from 'react-router-dom'
import { useUnit } from 'effector-react'
import type { AbzaTableRowId } from '@features/abza-table'
import type { PositionDto } from '@entities/position'
import type {
  AbzaSelectOption,
  AsyncEntityLoadOptions,
  AttributeConditionDraft,
  SortDirection,
} from '@shared/types'
import { loadAttributeOptions as fetchAttributeOptions } from '@entities/attribute'
import {
  createPosition,
  deletePositionsBatch,
  duplicatePositionsBatch,
  fetchPosition,
  fetchPositions,
} from '@entities/position'
import { fetchRestrictionsByPosition } from '@entities/restriction'
import { createResume, createResumesBatch, fetchResumePositionIds } from '@entities/resume'
import { fetchTags, tagsToSelectOptions } from '@entities/tag'
import { $session, isCandidate, isRecruiterOrAdmin } from '@entities/user'
import { parseTagIdsFromSearchParams } from '@shared/config/routes'
import { getErrorKey } from '@shared/lib/errors'
import { notificationsSocket } from '@shared/lib/websocket'
import type { PositionFormSubmitPayload } from '../ui/PositionFormModal'
import { restrictionsToDrafts } from './lib'
import {
  optionsFromPayload,
  savePositionFromFormPayload,
  syncPositionRelations,
  syncPositionRestrictions,
  toPositionSubmitValues,
} from './sync'

export type PositionTableFilters = {
  tags: AbzaSelectOption[]
}

const EMPTY_FILTERS: PositionTableFilters = {
  tags: [],
}

type EditDraftState = {
  requiredTags: AbzaSelectOption[]
  attributeConditions: AttributeConditionDraft[]
  tagRestrictionIds: Map<number, { id: number; version: number }>
  attributeRestrictionIds: Map<string, { id: number; version: number }>
}

type PositionsTableContextValue = {
  rows: PositionDto[]
  totalCount: number
  page: number
  pageSize: number
  sortBy: string
  sortDir: SortDirection
  selectedIds: AbzaTableRowId[]
  isLoading: boolean
  actionError: string | null
  isCreateModalOpen: boolean
  isEditModalOpen: boolean
  isViewModalOpen: boolean
  isFilterModalOpen: boolean
  editingPosition: PositionDto | null
  editDraft: EditDraftState | null
  appliedFilters: PositionTableFilters
  isFilterActive: boolean
  canManagePositions: boolean
  canCreateResumes: boolean
  resumePositionIdSet: Set<number>
  loadAttributeOptions: AsyncEntityLoadOptions
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSelectedIds: (ids: AbzaTableRowId[]) => void
  setIsCreateModalOpen: (open: boolean) => void
  setIsEditModalOpen: (open: boolean) => void
  setIsViewModalOpen: (open: boolean) => void
  setIsFilterModalOpen: (open: boolean) => void
  setActionError: (error: string | null) => void
  handleSortChange: (nextSortBy: string, nextSortDir: SortDirection) => void
  handleFilter: (query: string) => void
  handleApplyFilters: (filters: PositionTableFilters) => void
  handleResetFilters: () => void
  handleCreateClick: () => void
  handleCreateSubmit: (payload: PositionFormSubmitPayload) => Promise<void>
  handleEditSubmit: (payload: PositionFormSubmitPayload) => Promise<void>
  handleCreateResumeFromView: () => Promise<void>
  handleCreateResumesSelected: () => Promise<void>
  handleRowClick: (row: PositionDto) => Promise<void>
  handleDeleteSelected: () => Promise<void>
  handleDuplicateSelected: () => Promise<void>
}

const emptyEditDraft: EditDraftState = {
  requiredTags: [],
  attributeConditions: [],
  tagRestrictionIds: new Map(),
  attributeRestrictionIds: new Map(),
}

const PositionsTableContext = createContext<PositionsTableContextValue | null>(null)

export function PositionsTableProvider({ children }: PropsWithChildren) {
  const session = useUnit($session)
  const [searchParams, setSearchParams] = useSearchParams()

  const [rows, setRows] = useState<PositionDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<PositionTableFilters>(EMPTY_FILTERS)
  const [filtersReady, setFiltersReady] = useState(false)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<AbzaTableRowId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<PositionDto | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraftState | null>(null)
  const [resumePositionIds, setResumePositionIds] = useState<number[]>([])

  const canManagePositions = isRecruiterOrAdmin(session)
  const canCreateResumes = isCandidate(session)
  const resumePositionIdSet = useMemo(() => new Set(resumePositionIds), [resumePositionIds])
  const isFilterActive = appliedFilters.tags.length > 0

  const syncTagIdsToUrl = useCallback(
    (tags: AbzaSelectOption[]) => {
      const next = new URLSearchParams(searchParams)
      next.delete('tagIds')
      for (const tag of tags) {
        const id = Number(tag.value)
        if (Number.isFinite(id) && id > 0) {
          next.append('tagIds', String(id))
        }
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    const controller = new AbortController()
    const tagIds = parseTagIdsFromSearchParams(searchParams)

    void (async () => {
      if (tagIds.length === 0) {
        if (!controller.signal.aborted) {
          setFiltersReady(true)
        }
        return
      }

      try {
        const result = await fetchTags(
          { page: 1, size: tagIds.length, ids: tagIds, sortBy: 'name', sortDir: 'asc' },
          { signal: controller.signal },
        )
        if (!controller.signal.aborted) {
          setAppliedFilters({ tags: tagsToSelectOptions(result.items) })
          setFiltersReady(true)
        }
      } catch (error) {
        if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
          return
        }

        if (!controller.signal.aborted) {
          setFiltersReady(true)
        }
      }
    })()

    return () => controller.abort()
  }, [])

  const loadAttributeOptions = useCallback(
    (search: string, signal?: AbortSignal, page = 1) => fetchAttributeOptions(search, signal, page),
    [],
  )

  const loadResumePositionIds = useCallback(async (signal?: AbortSignal) => {
    if (!canCreateResumes) {
      setResumePositionIds([])
      return
    }

    try {
      const ids = await fetchResumePositionIds({ signal })
      if (!signal?.aborted) {
        setResumePositionIds(ids)
      }
    } catch (error) {
      if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
        return
      }

      if (!signal?.aborted) {
        setActionError(getErrorKey(error, 'error.resumes.load'))
      }
    }
  }, [canCreateResumes])

  const loadPositions = useCallback(async (signal?: AbortSignal) => {
    if (!filtersReady) {
      return
    }

    setIsLoading(true)
    setActionError(null)

    const tagIds = appliedFilters.tags
      .map((tag) => Number(tag.value))
      .filter((id) => Number.isFinite(id) && id > 0)

    try {
      const result = await fetchPositions(
        {
          page: page + 1,
          size: pageSize,
          search: searchQuery || undefined,
          sortBy,
          sortDir,
        },
        {
          signal,
          tagIds: tagIds.length > 0 ? tagIds : undefined,
        },
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
        setActionError(getErrorKey(error, 'error.positions.load'))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [appliedFilters, filtersReady, page, pageSize, searchQuery, sortBy, sortDir])

  useEffect(() => {
    const controller = new AbortController()
    void loadPositions(controller.signal)
    return () => controller.abort()
  }, [loadPositions])

  useEffect(() => {
    const controller = new AbortController()
    void loadResumePositionIds(controller.signal)
    return () => controller.abort()
  }, [loadResumePositionIds])

  useEffect(() => {
    return notificationsSocket.subscribe((event) => {
      setRows((current) =>
        current.map((row) =>
          row.id === event.positionId ? { ...row, messagesCount: event.messagesCount } : row,
        ),
      )
    })
  }, [])

  useEffect(() => {
    if (!isEditModalOpen && !isViewModalOpen) {
      setEditingPosition(null)
      setEditDraft(null)
    }
  }, [isEditModalOpen, isViewModalOpen])

  const handleFilter = useCallback((query: string) => {
    setSearchQuery(query.trim())
    setPage(0)
  }, [])

  const handleApplyFilters = useCallback(
    (filters: PositionTableFilters) => {
      setAppliedFilters({ tags: filters.tags })
      syncTagIdsToUrl(filters.tags)
      setIsFilterModalOpen(false)
      setPage(0)
    },
    [syncTagIdsToUrl],
  )

  const handleResetFilters = useCallback(() => {
    setAppliedFilters(EMPTY_FILTERS)
    syncTagIdsToUrl([])
    setIsFilterModalOpen(false)
    setPage(0)
  }, [syncTagIdsToUrl])

  const handleSortChange = useCallback((nextSortBy: string, nextSortDir: SortDirection) => {
    setSortBy(nextSortBy)
    setSortDir(nextSortDir)
    setPage(0)
  }, [])

  const handleCreateClick = useCallback(() => {
    setIsCreateModalOpen(true)
  }, [])

  const handleCreateSubmit = useCallback(
    async (payload: PositionFormSubmitPayload) => {
      setIsLoading(true)

      try {
        const created = await createPosition(toPositionSubmitValues(payload.info))
        const { attributeIds, tagIds } = await optionsFromPayload(payload)
        await syncPositionRelations(created.id, attributeIds, tagIds)
        await syncPositionRestrictions(
          created.id,
          payload.requiredTags,
          payload.attributeConditions,
          new Map(),
          new Map(),
        )
        setIsCreateModalOpen(false)
        await loadPositions()
      } finally {
        setIsLoading(false)
      }
    },
    [loadPositions],
  )

  const handleEditSubmit = useCallback(
    async (payload: PositionFormSubmitPayload) => {
      if (!editingPosition) {
        return
      }

      setIsLoading(true)

      try {
        const refreshed = await savePositionFromFormPayload(editingPosition, payload)
        setRows((currentRows) =>
          currentRows.map((row) => (row.id === refreshed.id ? refreshed : row)),
        )
        setIsEditModalOpen(false)
      } finally {
        setIsLoading(false)
      }
    },
    [editingPosition],
  )

  const handleRowClick = useCallback(
    async (row: PositionDto) => {
      if (!canManagePositions && !canCreateResumes) {
        return
      }

      setIsLoading(true)
      setActionError(null)

      try {
        if (canManagePositions) {
          const [detail, restrictions] = await Promise.all([
            fetchPosition(row.id),
            fetchRestrictionsByPosition(row.id),
          ])
          setEditingPosition(detail)
          setEditDraft(restrictionsToDrafts(restrictions))
          setIsEditModalOpen(true)
          return
        }

        const detail = await fetchPosition(row.id)
        setEditingPosition(detail)
        setEditDraft(emptyEditDraft)
        setIsViewModalOpen(true)
      } catch (error) {
        setActionError(getErrorKey(error, 'error.positions.load'))
        setEditDraft(emptyEditDraft)
      } finally {
        setIsLoading(false)
      }
    },
    [canCreateResumes, canManagePositions],
  )

  const handleCreateResumeFromView = useCallback(async () => {
    if (!editingPosition || resumePositionIdSet.has(editingPosition.id)) {
      return
    }

    setIsLoading(true)
    setActionError(null)

    try {
      await createResume({ positionId: editingPosition.id })
      setResumePositionIds((current) =>
        current.includes(editingPosition.id) ? current : [...current, editingPosition.id],
      )
      setIsViewModalOpen(false)
    } catch (error) {
      setActionError(getErrorKey(error, 'error.resumes.create'))
    } finally {
      setIsLoading(false)
    }
  }, [editingPosition, resumePositionIdSet])

  const handleCreateResumesSelected = useCallback(async () => {
    const positionIds = selectedIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && !resumePositionIdSet.has(id))

    if (positionIds.length === 0) {
      setActionError('error.resumes.alreadyExists')
      return
    }

    setIsLoading(true)
    setActionError(null)

    try {
      await createResumesBatch(positionIds)
      setResumePositionIds((current) => [...new Set([...current, ...positionIds])])
      setSelectedIds([])
    } catch (error) {
      setActionError(getErrorKey(error, 'error.resumes.create'))
      await loadResumePositionIds()
    } finally {
      setIsLoading(false)
    }
  }, [loadResumePositionIds, resumePositionIdSet, selectedIds])

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

      await deletePositionsBatch(items)
      const deletedIds = new Set(items.map((item) => item.id))
      setRows((currentRows) => currentRows.filter((row) => !deletedIds.has(row.id)))
      setTotalCount((currentTotal) => Math.max(0, currentTotal - count))
      setSelectedIds([])
    } catch (error) {
      setActionError(getErrorKey(error, 'error.positions.delete'))
      await loadPositions()
    } finally {
      setIsLoading(false)
    }
  }, [loadPositions, rows, selectedIds])

  const handleDuplicateSelected = useCallback(async () => {
    if (selectedIds.length === 0) {
      return
    }

    const positionIds = selectedIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    if (positionIds.length === 0) {
      return
    }

    setIsLoading(true)
    setActionError(null)

    try {
      await duplicatePositionsBatch(positionIds)
      setSelectedIds([])
      await loadPositions()
    } catch (error) {
      setActionError(getErrorKey(error, 'error.positions.duplicate'))
      await loadPositions()
    } finally {
      setIsLoading(false)
    }
  }, [loadPositions, selectedIds])

  const value = useMemo<PositionsTableContextValue>(
    () => ({
      rows,
      totalCount,
      page,
      pageSize,
      sortBy,
      sortDir,
      selectedIds,
      isLoading,
      actionError,
      isCreateModalOpen,
      isEditModalOpen,
      isViewModalOpen,
      isFilterModalOpen,
      editingPosition,
      editDraft,
      appliedFilters,
      isFilterActive,
      canManagePositions,
      canCreateResumes,
      resumePositionIdSet,
      loadAttributeOptions,
      setPage,
      setPageSize,
      setSelectedIds,
      setIsCreateModalOpen,
      setIsEditModalOpen,
      setIsViewModalOpen,
      setIsFilterModalOpen,
      setActionError,
      handleSortChange,
      handleFilter,
      handleApplyFilters,
      handleResetFilters,
      handleCreateClick,
      handleCreateSubmit,
      handleEditSubmit,
      handleCreateResumeFromView,
      handleCreateResumesSelected,
      handleRowClick,
      handleDeleteSelected,
      handleDuplicateSelected,
    }),
    [
      rows,
      totalCount,
      page,
      pageSize,
      sortBy,
      sortDir,
      selectedIds,
      isLoading,
      actionError,
      isCreateModalOpen,
      isEditModalOpen,
      isViewModalOpen,
      isFilterModalOpen,
      editingPosition,
      editDraft,
      appliedFilters,
      isFilterActive,
      canManagePositions,
      canCreateResumes,
      resumePositionIdSet,
      loadAttributeOptions,
      handleSortChange,
      handleFilter,
      handleApplyFilters,
      handleResetFilters,
      handleCreateClick,
      handleCreateSubmit,
      handleEditSubmit,
      handleCreateResumeFromView,
      handleCreateResumesSelected,
      handleRowClick,
      handleDeleteSelected,
      handleDuplicateSelected,
    ],
  )

  return <PositionsTableContext.Provider value={value}>{children}</PositionsTableContext.Provider>
}

export function usePositionsTable() {
  const context = useContext(PositionsTableContext)

  if (!context) {
    throw new Error('usePositionsTable must be used within PositionsTableProvider')
  }

  return context
}
