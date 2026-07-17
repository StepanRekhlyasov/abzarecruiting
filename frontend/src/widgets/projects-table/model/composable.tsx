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
import type { ProjectDto } from '@entities/project'
import type { AbzaSelectOption, SortDirection } from '@shared/types'
import {
  createProject,
  deleteProjectsBatch,
  fetchProject,
  fetchProjects,
  projectTagsToOptions,
  syncProjectTags,
  toProjectPayload,
  updateProject,
} from '@entities/project'
import { resolveTagIds } from '@entities/tag'
import { $session, fetchUsers, isAdmin, isCandidate, isRecruiter } from '@entities/user'
import { getErrorKey } from '@shared/lib/errors'

function getEntityOptionValue(values: AbzaFormValues, name: string): AbzaSelectOption | null {
  const value = values[name]
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'value' in value && 'label' in value) {
    return value
  }

  return null
}

function toProjectSubmitValues(values: AbzaFormValues, includeCandidateId: boolean) {
  const payload = toProjectPayload(values)
  const candidate = includeCandidateId ? getEntityOptionValue(values, 'candidateId') : null

  return {
    ...payload,
    ...(includeCandidateId ? { candidateId: candidate?.value || null } : {}),
  }
}

export type ProjectTableFilters = {
  tags: AbzaSelectOption[]
  candidates: AbzaSelectOption[]
}

const EMPTY_FILTERS: ProjectTableFilters = {
  tags: [],
  candidates: [],
}

type ProjectsTableContextValue = {
  rows: ProjectDto[]
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
  isFilterModalOpen: boolean
  editingProject: ProjectDto | null
  createTags: AbzaSelectOption[]
  editTags: AbzaSelectOption[]
  appliedFilters: ProjectTableFilters
  isFilterActive: boolean
  canAccessProjects: boolean
  canCreateProjects: boolean
  showCandidateColumn: boolean
  showCandidateSelect: boolean
  showCandidateFilter: boolean
  createFormRef: RefObject<HTMLFormElement | null>
  editFormRef: RefObject<HTMLFormElement | null>
  loadCandidateOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  setSearchInput: (value: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSelectedIds: (ids: AbzaTableRowId[]) => void
  setIsCreateModalOpen: (open: boolean) => void
  setIsEditModalOpen: (open: boolean) => void
  setIsFilterModalOpen: (open: boolean) => void
  setCreateTags: (tags: AbzaSelectOption[]) => void
  setEditTags: (tags: AbzaSelectOption[]) => void
  setActionError: (error: string | null) => void
  handleSortChange: (nextSortBy: string, nextSortDir: SortDirection) => void
  handleFilter: () => void
  handleApplyFilters: (filters: ProjectTableFilters) => void
  handleResetFilters: () => void
  handleCreateClick: () => void
  handleCreateSubmit: (values: AbzaFormValues) => Promise<void>
  handleEditSubmit: (values: AbzaFormValues) => Promise<void>
  handleCreateModalSubmit: () => void
  handleEditModalSubmit: () => void
  handleRowClick: (row: ProjectDto) => void
  handleDeleteSelected: () => Promise<void>
}

const ProjectsTableContext = createContext<ProjectsTableContextValue | null>(null)

type ProjectsTableProviderProps = PropsWithChildren<{
  candidateId?: string
}>

export function ProjectsTableProvider({ candidateId, children }: ProjectsTableProviderProps) {
  const session = useUnit($session)
  const createFormRef = useRef<HTMLFormElement>(null)
  const editFormRef = useRef<HTMLFormElement>(null)

  const [rows, setRows] = useState<ProjectDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<ProjectTableFilters>(EMPTY_FILTERS)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<AbzaTableRowId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null)
  const [createTags, setCreateTags] = useState<AbzaSelectOption[]>([])
  const [editTags, setEditTags] = useState<AbzaSelectOption[]>([])

  const canAccessProjects =
    isCandidate(session) || isAdmin(session) || (isRecruiter(session) && Boolean(candidateId))
  const canCreateProjects = isCandidate(session) || isAdmin(session)
  const showCandidateColumn = isAdmin(session) && !candidateId
  const showCandidateSelect = showCandidateColumn
  const showCandidateFilter = showCandidateColumn
  const isAdminUser = isAdmin(session)
  const isFilterActive =
    appliedFilters.tags.length > 0 || appliedFilters.candidates.length > 0

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

  const loadProjects = useCallback(async (signal?: AbortSignal) => {
    if (!canAccessProjects) {
      setRows([])
      setTotalCount(0)
      return
    }

    setIsLoading(true)
    setActionError(null)

    const tagIds = appliedFilters.tags
      .map((tag) => Number(tag.value))
      .filter((id) => Number.isFinite(id) && id > 0)

    const candidateIds = appliedFilters.candidates
      .map((item) => item.value.trim())
      .filter(Boolean)

    try {
      const result = await fetchProjects(
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
          candidateIds: !candidateId && candidateIds.length > 0 ? candidateIds : undefined,
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
        setActionError(getErrorKey(error, 'error.projects.load'))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [
    appliedFilters,
    canAccessProjects,
    candidateId,
    page,
    pageSize,
    searchQuery,
    sortBy,
    sortDir,
  ])

  useEffect(() => {
    const controller = new AbortController()
    void loadProjects(controller.signal)
    return () => controller.abort()
  }, [loadProjects])

  useEffect(() => {
    if (!isCreateModalOpen) {
      setCreateTags([])
    }
  }, [isCreateModalOpen])

  useEffect(() => {
    if (!isEditModalOpen) {
      setEditingProject(null)
      setEditTags([])
    }
  }, [isEditModalOpen])

  const handleFilter = useCallback(() => {
    setSearchQuery(searchInput.trim())
    setPage(0)
  }, [searchInput])

  const handleApplyFilters = useCallback((filters: ProjectTableFilters) => {
    setAppliedFilters({
      tags: filters.tags,
      candidates: filters.candidates,
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
    setCreateTags([])
    setIsCreateModalOpen(true)
  }, [])

  const handleCreateSubmit = useCallback(
    async (values: AbzaFormValues) => {
      setIsLoading(true)
      setActionError(null)

      try {
        const payload = showCandidateSelect
          ? toProjectSubmitValues(values, true)
          : {
              ...toProjectSubmitValues(values, false),
              ...(isAdminUser && candidateId ? { candidateId } : {}),
            }
        const created = await createProject(payload)
        const tagIds = await resolveTagIds(createTags)
        await syncProjectTags(created.id, tagIds)
        setIsCreateModalOpen(false)
        await loadProjects()
      } catch (error) {
        setActionError(getErrorKey(error, 'error.projects.create'))
      } finally {
        setIsLoading(false)
      }
    },
    [candidateId, createTags, isAdminUser, loadProjects, showCandidateSelect],
  )

  const handleEditSubmit = useCallback(
    async (values: AbzaFormValues) => {
      if (!editingProject) {
        return
      }

      setIsLoading(true)
      setActionError(null)

      try {
        await updateProject(editingProject.id, toProjectSubmitValues(values, false))
        const tagIds = await resolveTagIds(editTags)
        await syncProjectTags(
          editingProject.id,
          tagIds,
          editingProject.tags.map((tag) => tag.id),
        )
        const refreshed = await fetchProject(editingProject.id)
        setRows((currentRows) =>
          currentRows.map((row) => (row.id === refreshed.id ? refreshed : row)),
        )
        setIsEditModalOpen(false)
      } catch (error) {
        setActionError(getErrorKey(error, 'error.projects.update'))
      } finally {
        setIsLoading(false)
      }
    },
    [editTags, editingProject],
  )

  const handleCreateModalSubmit = useCallback(() => {
    createFormRef.current?.requestSubmit()
  }, [])

  const handleEditModalSubmit = useCallback(() => {
    editFormRef.current?.requestSubmit()
  }, [])

  const handleRowClick = useCallback(
    (row: ProjectDto) => {
      if (!canCreateProjects) {
        return
      }

      setEditingProject(row)
      setEditTags(projectTagsToOptions(row))
      setIsEditModalOpen(true)
    },
    [canCreateProjects],
  )

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0) {
      return
    }

    const count = selectedIds.length
    setIsLoading(true)
    setActionError(null)

    try {
      await deleteProjectsBatch(selectedIds.map((id) => Number(id)))
      const deletedIds = new Set(selectedIds.map((id) => Number(id)))
      setRows((currentRows) => currentRows.filter((row) => !deletedIds.has(row.id)))
      setTotalCount((currentTotal) => Math.max(0, currentTotal - count))
      setSelectedIds([])
    } catch (error) {
      setActionError(getErrorKey(error, 'error.projects.delete'))
      await loadProjects()
    } finally {
      setIsLoading(false)
    }
  }, [loadProjects, selectedIds])

  const value = useMemo<ProjectsTableContextValue>(
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
      isFilterModalOpen,
      editingProject,
      createTags,
      editTags,
      appliedFilters,
      isFilterActive,
      canAccessProjects,
      canCreateProjects,
      showCandidateColumn,
      showCandidateSelect,
      showCandidateFilter,
      createFormRef,
      editFormRef,
      loadCandidateOptions,
      setSearchInput,
      setPage,
      setPageSize,
      setSelectedIds,
      setIsCreateModalOpen,
      setIsEditModalOpen,
      setIsFilterModalOpen,
      setCreateTags,
      setEditTags,
      setActionError,
      handleSortChange,
      handleFilter,
      handleApplyFilters,
      handleResetFilters,
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
      isFilterModalOpen,
      editingProject,
      createTags,
      editTags,
      appliedFilters,
      isFilterActive,
      canAccessProjects,
      canCreateProjects,
      showCandidateColumn,
      showCandidateSelect,
      showCandidateFilter,
      loadCandidateOptions,
      handleSortChange,
      handleFilter,
      handleApplyFilters,
      handleResetFilters,
      handleCreateClick,
      handleCreateSubmit,
      handleEditSubmit,
      handleCreateModalSubmit,
      handleEditModalSubmit,
      handleRowClick,
      handleDeleteSelected,
    ],
  )

  return <ProjectsTableContext.Provider value={value}>{children}</ProjectsTableContext.Provider>
}

export function useProjectsTable() {
  const context = useContext(ProjectsTableContext)

  if (!context) {
    throw new Error('useProjectsTable must be used within ProjectsTableProvider')
  }

  return context
}
