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
import type { TagDto } from '@entities/tag'
import type { SortDirection } from '@shared/types'
import { createTag, deleteTag, fetchTags, updateTag } from '@entities/tag'
import { $session, isRecruiterOrAdmin } from '@entities/user'
import { getErrorKey } from '@shared/lib/errors'
import { toSubmitValues } from '@shared/lib/helpers'

function toTagSubmitValues(values: AbzaFormValues) {
  const { name } = toSubmitValues(values, ['name'])
  return { name }
}

type TagsTableContextValue = {
  rows: TagDto[]
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
  editingTag: TagDto | null
  canCreateTags: boolean
  canManageTags: boolean
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
  handleRowClick: (row: TagDto) => void
  handleDeleteSelected: () => Promise<void>
}

const TagsTableContext = createContext<TagsTableContextValue | null>(null)

export function TagsTableProvider({ children }: PropsWithChildren) {
  const session = useUnit($session)
  const createFormRef = useRef<HTMLFormElement>(null)
  const editFormRef = useRef<HTMLFormElement>(null)

  const [rows, setRows] = useState<TagDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [selectedIds, setSelectedIds] = useState<AbzaTableRowId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagDto | null>(null)

  const canCreateTags = Boolean(session)
  const canManageTags = isRecruiterOrAdmin(session)

  const loadTags = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setActionError(null)

    try {
      const result = await fetchTags(
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
        setActionError(getErrorKey(error, 'error.tags.load'))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [page, pageSize, searchQuery, sortBy, sortDir])

  useEffect(() => {
    const controller = new AbortController()
    void loadTags(controller.signal)
    return () => controller.abort()
  }, [loadTags])

  useEffect(() => {
    if (!isEditModalOpen) {
      setEditingTag(null)
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
        await createTag(toTagSubmitValues(values))
        setIsCreateModalOpen(false)
        await loadTags()
      } finally {
        setIsLoading(false)
      }
    },
    [loadTags],
  )

  const handleEditSubmit = useCallback(
    async (values: AbzaFormValues) => {
      if (!editingTag) {
        return
      }

      setIsLoading(true)

      try {
        const updated = await updateTag(editingTag.id, {
          ...toTagSubmitValues(values),
          version: editingTag.version,
        })
        setRows((currentRows) =>
          currentRows.map((row) => (row.id === updated.id ? updated : row)),
        )
        setIsEditModalOpen(false)
      } finally {
        setIsLoading(false)
      }
    },
    [editingTag],
  )

  const handleCreateModalSubmit = useCallback(() => {
    createFormRef.current?.requestSubmit()
  }, [])

  const handleEditModalSubmit = useCallback(() => {
    editFormRef.current?.requestSubmit()
  }, [])

  const handleRowClick = useCallback(
    (row: TagDto) => {
      if (!canManageTags) {
        return
      }

      setEditingTag(row)
      setIsEditModalOpen(true)
    },
    [canManageTags],
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

      await Promise.all(items.map((item) => deleteTag(item.id, item.version)))
      const deletedIds = new Set(items.map((item) => item.id))
      setRows((currentRows) => currentRows.filter((row) => !deletedIds.has(row.id)))
      setTotalCount((currentTotal) => Math.max(0, currentTotal - count))
      setSelectedIds([])
    } catch (error) {
      setActionError(getErrorKey(error, 'error.tags.delete'))
      await loadTags()
    } finally {
      setIsLoading(false)
    }
  }, [loadTags, rows, selectedIds])

  const value = useMemo<TagsTableContextValue>(
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
      editingTag,
      canCreateTags,
      canManageTags,
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
      editingTag,
      canCreateTags,
      canManageTags,
      handleSortChange,
      handleFilter,
      handleCreateClick,
      handleCreateSubmit,
      handleEditSubmit,
      handleCreateModalSubmit,
      handleEditModalSubmit,
      handleRowClick,
      handleDeleteSelected,
    ],
  )

  return <TagsTableContext.Provider value={value}>{children}</TagsTableContext.Provider>
}

export function useTagsTable() {
  const context = useContext(TagsTableContext)

  if (!context) {
    throw new Error('useTagsTable must be used within TagsTableProvider')
  }

  return context
}
