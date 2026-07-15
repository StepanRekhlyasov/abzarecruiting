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
import { useUnit } from 'effector-react'
import type { AbzaTableRowId } from '@features/abza-table'
import type { PositionDto } from '@entities/position'
import type {
  AbzaSelectOption,
  AttributeConditionDraft,
  SortDirection,
} from '@shared/types'
import { fetchAttributes } from '@entities/attribute'
import {
  createPosition,
  deletePosition,
  duplicatePosition,
  fetchPosition,
  fetchPositions,
  updatePosition,
} from '@entities/position'
import { fetchRestrictionsByPosition } from '@entities/restriction'
import { createResume, fetchResumePositionIds } from '@entities/resume'
import { $session, isCandidate, isRecruiterOrAdmin } from '@entities/user'
import { getErrorKey } from '@shared/lib/errors'
import type { PositionFormSubmitPayload } from '../ui/PositionFormModal'
import { restrictionsToDrafts } from './lib'
import {
  optionsFromPayload,
  syncPositionRelations,
  syncPositionRestrictions,
  toPositionSubmitValues,
} from './sync'

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
  searchInput: string
  sortBy: string
  sortDir: SortDirection
  selectedIds: AbzaTableRowId[]
  isLoading: boolean
  actionError: string | null
  isCreateModalOpen: boolean
  isEditModalOpen: boolean
  isViewModalOpen: boolean
  editingPosition: PositionDto | null
  editDraft: EditDraftState | null
  canManagePositions: boolean
  canCreateResumes: boolean
  resumePositionIdSet: Set<number>
  loadAttributeOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  setSearchInput: (value: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSelectedIds: (ids: AbzaTableRowId[]) => void
  setIsCreateModalOpen: (open: boolean) => void
  setIsEditModalOpen: (open: boolean) => void
  setIsViewModalOpen: (open: boolean) => void
  setActionError: (error: string | null) => void
  handleSortChange: (nextSortBy: string, nextSortDir: SortDirection) => void
  handleFilter: () => void
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

  const [rows, setRows] = useState<PositionDto[]>([])
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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<PositionDto | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraftState | null>(null)
  const [resumePositionIds, setResumePositionIds] = useState<number[]>([])

  const canManagePositions = isRecruiterOrAdmin(session)
  const canCreateResumes = isCandidate(session)
  const resumePositionIdSet = useMemo(() => new Set(resumePositionIds), [resumePositionIds])

  const loadAttributeOptions = useCallback(async (search: string, signal?: AbortSignal) => {
    const result = await fetchAttributes(
      {
        page: 1,
        size: 20,
        search: search || undefined,
        sortBy: 'name',
        sortDir: 'asc',
      },
      { signal },
    )

    return result.items.map((item) => ({
      value: String(item.id),
      label: item.name,
      valueType: item.valueType,
    }))
  }, [])

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
    setIsLoading(true)
    setActionError(null)

    try {
      const result = await fetchPositions(
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
        setActionError(getErrorKey(error, 'error.positions.load'))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [page, pageSize, searchQuery, sortBy, sortDir])

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
    if (!isEditModalOpen && !isViewModalOpen) {
      setEditingPosition(null)
      setEditDraft(null)
    }
  }, [isEditModalOpen, isViewModalOpen])

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
        await updatePosition(editingPosition.id, {
          ...toPositionSubmitValues(payload.info),
          version: editingPosition.version,
        })
        const { attributeIds, tagIds } = await optionsFromPayload(payload)
        await syncPositionRelations(
          editingPosition.id,
          attributeIds,
          tagIds,
          editingPosition.attributes.map((item) => item.attributeId),
          editingPosition.tags.map((item) => item.tagId),
        )
        await syncPositionRestrictions(
          editingPosition.id,
          payload.requiredTags,
          payload.attributeConditions,
          payload.initialTagRestrictionIds,
          payload.initialAttributeRestrictionIds,
        )
        const refreshed = await fetchPosition(editingPosition.id)
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
      await Promise.all(positionIds.map((id) => createResume({ positionId: id })))
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

      await Promise.all(items.map((item) => deletePosition(item.id, item.version)))
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
      await Promise.all(positionIds.map((id) => duplicatePosition(id)))
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
      searchInput,
      sortBy,
      sortDir,
      selectedIds,
      isLoading,
      actionError,
      isCreateModalOpen,
      isEditModalOpen,
      isViewModalOpen,
      editingPosition,
      editDraft,
      canManagePositions,
      canCreateResumes,
      resumePositionIdSet,
      loadAttributeOptions,
      setSearchInput,
      setPage,
      setPageSize,
      setSelectedIds,
      setIsCreateModalOpen,
      setIsEditModalOpen,
      setIsViewModalOpen,
      setActionError,
      handleSortChange,
      handleFilter,
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
      searchInput,
      sortBy,
      sortDir,
      selectedIds,
      isLoading,
      actionError,
      isCreateModalOpen,
      isEditModalOpen,
      isViewModalOpen,
      editingPosition,
      editDraft,
      canManagePositions,
      canCreateResumes,
      resumePositionIdSet,
      loadAttributeOptions,
      handleSortChange,
      handleFilter,
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
