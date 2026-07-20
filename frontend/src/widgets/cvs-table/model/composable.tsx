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
import { useSearchParams } from 'react-router-dom'
import { useUnit } from 'effector-react'
import type { AbzaFormValues } from '@features/abza-form'
import type { AbzaTableRowId } from '@features/abza-table'
import type { ResumeLikeStateDto, ResumeListItemDto } from '@entities/resume'
import type { AbzaSelectOption, SortDirection } from '@shared/types'
import { createResume, deleteResumesBatch, fetchResumes } from '@entities/resume'
import { fetchPositions } from '@entities/position'
import { fetchTags, tagsToSelectOptions } from '@entities/tag'
import { $session, fetchUsers, isAdmin, isCandidate, isRecruiter, isRecruiterOrAdmin } from '@entities/user'
import { parseTagIdsFromSearchParams } from '@shared/config/routes'
import { getErrorKey } from '@shared/lib/errors'

function getEntityOptionValue(values: AbzaFormValues, name: string): AbzaSelectOption | null {
  const value = values[name]
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'value' in value && 'label' in value) {
    return value
  }

  return null
}

export type CvsTableFilters = {
  tags: AbzaSelectOption[]
}

const EMPTY_FILTERS: CvsTableFilters = {
  tags: [],
}

type CvsTableContextValue = {
  rows: ResumeListItemDto[]
  totalCount: number
  page: number
  pageSize: number
  sortBy: string
  sortDir: SortDirection
  selectedIds: AbzaTableRowId[]
  isLoading: boolean
  actionError: string | null
  isCreateModalOpen: boolean
  isFilterModalOpen: boolean
  appliedFilters: CvsTableFilters
  isFilterActive: boolean
  canCreateResumes: boolean
  canDeleteResumes: boolean
  canLikeResumes: boolean
  canFilterByTags: boolean
  showCandidateColumn: boolean
  showPositionColumn: boolean
  showPublishedColumn: boolean
  showCandidateSelect: boolean
  hidePositionSelect: boolean
  canLinkCandidateProfile: boolean
  createFormRef: RefObject<HTMLFormElement | null>
  loadPositionOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  loadCandidateOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSelectedIds: (ids: AbzaTableRowId[]) => void
  setActionError: (error: string | null) => void
  setIsCreateModalOpen: (open: boolean) => void
  setIsFilterModalOpen: (open: boolean) => void
  handleSortChange: (nextSortBy: string, nextSortDir: SortDirection) => void
  handleFilter: (query: string) => void
  handleApplyFilters: (filters: CvsTableFilters) => void
  handleResetFilters: () => void
  handleCreateClick: () => void
  handleCreateSubmit: (values: AbzaFormValues) => Promise<void>
  handleCreateModalSubmit: () => void
  handleDeleteSelected: () => Promise<void>
  handleLikeChange: (resumeId: number, state: ResumeLikeStateDto) => void
}

const CvsTableContext = createContext<CvsTableContextValue | null>(null)

type CvsTableProviderProps = PropsWithChildren<{
  candidateId?: string
  positionId?: number
}>

export function CvsTableProvider({ candidateId, positionId, children }: CvsTableProviderProps) {
  const session = useUnit($session)
  const [searchParams, setSearchParams] = useSearchParams()
  const createFormRef = useRef<HTMLFormElement>(null)

  const [rows, setRows] = useState<ResumeListItemDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<CvsTableFilters>(EMPTY_FILTERS)
  const [filtersReady, setFiltersReady] = useState(false)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<AbzaTableRowId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const isPositionScoped = positionId != null
  const isScoped = isPositionScoped || Boolean(candidateId)
  const canFilterByTags = !isScoped
  const isAdminUser = isAdmin(session)
  const canCreateResumes = isAdminUser || (!isPositionScoped && isCandidate(session))
  const canDeleteResumes = canCreateResumes
  const canLikeResumes = isRecruiter(session)
  const showCandidateColumn = isRecruiterOrAdmin(session) && !candidateId
  const showPositionColumn = !isPositionScoped
  const showPublishedColumn = !isRecruiter(session)
  const showCandidateSelect = isAdminUser && !candidateId
  const hidePositionSelect = isPositionScoped
  const canLinkCandidateProfile = isAdminUser
  const isFilterActive = appliedFilters.tags.length > 0

  const syncTagIdsToUrl = useCallback(
    (tags: AbzaSelectOption[]) => {
      if (!canFilterByTags) {
        return
      }

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
    [canFilterByTags, searchParams, setSearchParams],
  )

  useEffect(() => {
    if (!canFilterByTags) {
      setFiltersReady(true)
      return
    }

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
  }, [canFilterByTags])

  const loadPositionOptions = useCallback(async (search: string, signal?: AbortSignal) => {
    const result = await fetchPositions(
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
    }))
  }, [])

  const loadCandidateOptions = useCallback(async (search: string, signal?: AbortSignal) => {
    const result = await fetchUsers(
      {
        page: 1,
        size: 50,
        search: search || undefined,
        sortBy: 'firstName',
        sortDir: 'asc',
      },
      { signal },
    )

    return result.items
      .filter((item) => item.role === 'Candidate')
      .slice(0, 20)
      .map((item) => {
        const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ').trim()
        return {
          value: item.id,
          label: fullName || item.email,
        }
      })
  }, [])

  const loadResumes = useCallback(
    async (signal?: AbortSignal) => {
      if (!filtersReady) {
        return
      }

      setIsLoading(true)
      setActionError(null)

      const tagIds = canFilterByTags
        ? appliedFilters.tags
            .map((tag) => Number(tag.value))
            .filter((id) => Number.isFinite(id) && id > 0)
        : []

      try {
        const result = await fetchResumes(
          {
            page: page + 1,
            size: pageSize,
            search: searchQuery || undefined,
            sortBy,
            sortDir,
          },
          {
            signal,
            candidateId,
            positionId,
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
          setActionError(getErrorKey(error, 'error.resumes.load'))
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [
      appliedFilters,
      canFilterByTags,
      candidateId,
      filtersReady,
      page,
      pageSize,
      positionId,
      searchQuery,
      sortBy,
      sortDir,
    ],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadResumes(controller.signal)
    return () => controller.abort()
  }, [loadResumes])

  const handleFilter = useCallback((query: string) => {
    setSearchQuery(query.trim())
    setPage(0)
  }, [])

  const handleApplyFilters = useCallback(
    (filters: CvsTableFilters) => {
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
    async (values: AbzaFormValues) => {
      const resolvedPositionId = isPositionScoped
        ? positionId
        : Number(getEntityOptionValue(values, 'positionId')?.value)

      if (resolvedPositionId == null || !Number.isFinite(resolvedPositionId)) {
        setActionError('error.resumes.create')
        return
      }

      const selectedCandidate = showCandidateSelect
        ? getEntityOptionValue(values, 'candidateId')?.value
        : candidateId

      if (isAdminUser && !selectedCandidate) {
        setActionError('error.profile.notCandidate')
        return
      }

      setIsLoading(true)
      setActionError(null)

      try {
        await createResume({
          positionId: resolvedPositionId,
          candidateId: isAdminUser ? selectedCandidate : undefined,
        })
        setIsCreateModalOpen(false)
        await loadResumes()
      } catch (error) {
        setActionError(getErrorKey(error, 'error.resumes.create'))
      } finally {
        setIsLoading(false)
      }
    },
    [
      candidateId,
      isAdminUser,
      isPositionScoped,
      loadResumes,
      positionId,
      showCandidateSelect,
    ],
  )

  const handleCreateModalSubmit = useCallback(() => {
    createFormRef.current?.requestSubmit()
  }, [])

  const handleDeleteSelected = useCallback(async () => {
    if (!canDeleteResumes || selectedIds.length === 0) {
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

      await deleteResumesBatch(items)
      const deletedIds = new Set(items.map((item) => item.id))
      setRows((currentRows) => currentRows.filter((row) => !deletedIds.has(row.id)))
      setTotalCount((currentTotal) => Math.max(0, currentTotal - count))
      setSelectedIds([])
    } catch (error) {
      setActionError(getErrorKey(error, 'error.resumes.delete'))
      await loadResumes()
    } finally {
      setIsLoading(false)
    }
  }, [canDeleteResumes, loadResumes, rows, selectedIds])

  const handleLikeChange = useCallback((resumeId: number, state: ResumeLikeStateDto) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === resumeId
          ? {
              ...row,
              likesCount: state.likesCount,
              likedByCurrentUser: state.likedByCurrentUser,
            }
          : row,
      ),
    )
  }, [])

  const value = useMemo<CvsTableContextValue>(
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
      isFilterModalOpen,
      appliedFilters,
      isFilterActive,
      canCreateResumes,
      canDeleteResumes,
      canLikeResumes,
      canFilterByTags,
      showCandidateColumn,
      showPositionColumn,
      showPublishedColumn,
      showCandidateSelect,
      hidePositionSelect,
      canLinkCandidateProfile,
      createFormRef,
      loadPositionOptions,
      loadCandidateOptions,
      setPage,
      setPageSize,
      setSelectedIds,
      setActionError,
      setIsCreateModalOpen,
      setIsFilterModalOpen,
      handleSortChange,
      handleFilter,
      handleApplyFilters,
      handleResetFilters,
      handleCreateClick,
      handleCreateSubmit,
      handleCreateModalSubmit,
      handleDeleteSelected,
      handleLikeChange,
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
      isFilterModalOpen,
      appliedFilters,
      isFilterActive,
      canCreateResumes,
      canDeleteResumes,
      canLikeResumes,
      canFilterByTags,
      showCandidateColumn,
      showPositionColumn,
      showPublishedColumn,
      showCandidateSelect,
      hidePositionSelect,
      canLinkCandidateProfile,
      loadPositionOptions,
      loadCandidateOptions,
      handleSortChange,
      handleFilter,
      handleApplyFilters,
      handleResetFilters,
      handleCreateClick,
      handleCreateSubmit,
      handleCreateModalSubmit,
      handleDeleteSelected,
      handleLikeChange,
    ],
  )

  return <CvsTableContext.Provider value={value}>{children}</CvsTableContext.Provider>
}

export function useCvsTable() {
  const context = useContext(CvsTableContext)

  if (!context) {
    throw new Error('useCvsTable must be used within CvsTableProvider')
  }

  return context
}
