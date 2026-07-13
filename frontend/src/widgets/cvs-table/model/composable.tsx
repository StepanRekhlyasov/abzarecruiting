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
import type { ResumeListItemDto } from '@entities/resume'
import type { SortDirection } from '@shared/types'
import { deleteResume, fetchResumes } from '@entities/resume'
import { $session, isAdmin, isCandidate, isRecruiterOrAdmin } from '@entities/user'
import { getErrorKey } from '@shared/lib/errors'

type CvsTableContextValue = {
  rows: ResumeListItemDto[]
  totalCount: number
  page: number
  pageSize: number
  searchInput: string
  sortBy: string
  sortDir: SortDirection
  selectedIds: AbzaTableRowId[]
  isLoading: boolean
  actionError: string | null
  canDeleteResumes: boolean
  showCandidateColumn: boolean
  setSearchInput: (value: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSelectedIds: (ids: AbzaTableRowId[]) => void
  setActionError: (error: string | null) => void
  handleSortChange: (nextSortBy: string, nextSortDir: SortDirection) => void
  handleFilter: () => void
  handleDeleteSelected: () => Promise<void>
}

const CvsTableContext = createContext<CvsTableContextValue | null>(null)

export function CvsTableProvider({ children }: PropsWithChildren) {
  const session = useUnit($session)

  const [rows, setRows] = useState<ResumeListItemDto[]>([])
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

  const canDeleteResumes = isAdmin(session) || isCandidate(session)
  const showCandidateColumn = isRecruiterOrAdmin(session)

  const loadResumes = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setActionError(null)

    try {
      const result = await fetchResumes(
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
        setActionError(getErrorKey(error, 'error.resumes.load'))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [page, pageSize, searchQuery, sortBy, sortDir])

  useEffect(() => {
    const controller = new AbortController()
    void loadResumes(controller.signal)
    return () => controller.abort()
  }, [loadResumes])

  const handleFilter = useCallback(() => {
    setSearchQuery(searchInput.trim())
    setPage(0)
  }, [searchInput])

  const handleSortChange = useCallback((nextSortBy: string, nextSortDir: SortDirection) => {
    setSortBy(nextSortBy)
    setSortDir(nextSortDir)
    setPage(0)
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

      await Promise.all(items.map((item) => deleteResume(item.id, item.version)))
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

  const value = useMemo<CvsTableContextValue>(
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
      canDeleteResumes,
      showCandidateColumn,
      setSearchInput,
      setPage,
      setPageSize,
      setSelectedIds,
      setActionError,
      handleSortChange,
      handleFilter,
      handleDeleteSelected,
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
      canDeleteResumes,
      showCandidateColumn,
      handleSortChange,
      handleFilter,
      handleDeleteSelected,
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
