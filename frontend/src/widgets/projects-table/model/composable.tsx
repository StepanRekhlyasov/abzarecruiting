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
  deleteProject,
  deleteProjectTag,
  fetchProject,
  fetchProjects,
  updateProject,
  upsertProjectTag,
} from '@entities/project'
import { createTag, fetchTags } from '@entities/tag'
import { $session, fetchUsers, isAdmin, isCandidate, isRecruiter } from '@entities/user'
import { getErrorKey } from '@shared/lib/errors'
import { toSubmitValues } from '@shared/lib/helpers'
import { NEW_TAG_VALUE_PREFIX } from '@shared/ui/inputs/AsyncEntityTags'

function getTagOptions(values: AbzaFormValues): AbzaSelectOption[] {
  const value = values.tags
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (item): item is AbzaSelectOption =>
      typeof item === 'object' && item !== null && 'value' in item && 'label' in item,
  )
}

function getEntityOptionValue(values: AbzaFormValues, name: string): AbzaSelectOption | null {
  const value = values[name]
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'value' in value && 'label' in value) {
    return value
  }

  return null
}

function toIsoDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return `${trimmed}T00:00:00.000Z`
}

function toProjectSubmitValues(values: AbzaFormValues, includeCandidateId: boolean) {
  const submitted = toSubmitValues(values, ['name', 'description', 'startAt', 'endAt'] as const)
  const endAt = submitted.endAt.trim()
  const candidate = includeCandidateId ? getEntityOptionValue(values, 'candidateId') : null

  return {
    ...(includeCandidateId ? { candidateId: candidate?.value || null } : {}),
    name: submitted.name,
    description: submitted.description,
    startAt: toIsoDate(submitted.startAt)!,
    endAt: endAt ? toIsoDate(endAt) : null,
  }
}

async function resolveTagIds(options: AbzaSelectOption[]) {
  const ids: number[] = []

  for (const option of options) {
    if (option.isNew || option.value.startsWith(NEW_TAG_VALUE_PREFIX)) {
      const name = option.label.trim()
      if (!name) {
        continue
      }

      const existing = await fetchTags({
        page: 1,
        size: 20,
        search: name,
        sortBy: 'name',
        sortDir: 'asc',
      })
      const match = existing.items.find((item) => item.name.toLowerCase() === name.toLowerCase())
      if (match) {
        ids.push(match.id)
        continue
      }

      const created = await createTag({ name })
      ids.push(created.id)
      continue
    }

    const id = Number(option.value)
    if (Number.isFinite(id)) {
      ids.push(id)
    }
  }

  return [...new Set(ids)]
}

async function syncProjectTags(
  projectId: number,
  nextTagIds: number[],
  currentTagIds: number[] = [],
) {
  const desired = new Set(nextTagIds)
  const existing = new Set(currentTagIds)

  await Promise.all([
    ...[...desired]
      .filter((id) => !existing.has(id))
      .map((tagId) => upsertProjectTag(projectId, tagId)),
    ...[...existing]
      .filter((id) => !desired.has(id))
      .map((tagId) => deleteProjectTag(projectId, tagId)),
  ])
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
  editingProject: ProjectDto | null
  canAccessProjects: boolean
  canCreateProjects: boolean
  showCandidateColumn: boolean
  showCandidateSelect: boolean
  createFormRef: RefObject<HTMLFormElement | null>
  editFormRef: RefObject<HTMLFormElement | null>
  loadTagOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  loadCandidateOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
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
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<AbzaTableRowId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null)

  const canAccessProjects =
    isCandidate(session) || isAdmin(session) || (isRecruiter(session) && Boolean(candidateId))
  const canCreateProjects = isCandidate(session) || isAdmin(session)
  const showCandidateColumn = isAdmin(session) && !candidateId
  const showCandidateSelect = showCandidateColumn
  const isAdminUser = isAdmin(session)

  const loadTagOptions = useCallback(async (search: string, signal?: AbortSignal) => {
    const result = await fetchTags(
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

  const loadProjects = useCallback(async (signal?: AbortSignal) => {
    if (!canAccessProjects) {
      setRows([])
      setTotalCount(0)
      return
    }

    setIsLoading(true)
    setActionError(null)

    try {
      const result = await fetchProjects(
        {
          page: page + 1,
          size: pageSize,
          search: searchQuery || undefined,
          sortBy,
          sortDir,
        },
        { signal, candidateId },
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
  }, [canAccessProjects, candidateId, page, pageSize, searchQuery, sortBy, sortDir])

  useEffect(() => {
    const controller = new AbortController()
    void loadProjects(controller.signal)
    return () => controller.abort()
  }, [loadProjects])

  useEffect(() => {
    if (!isEditModalOpen) {
      setEditingProject(null)
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
      setActionError(null)

      try {
        const payload = showCandidateSelect
          ? toProjectSubmitValues(values, true)
          : {
              ...toProjectSubmitValues(values, false),
              ...(isAdminUser && candidateId ? { candidateId } : {}),
            }
        const created = await createProject(payload)
        const tagIds = await resolveTagIds(getTagOptions(values))
        await syncProjectTags(created.id, tagIds)
        setIsCreateModalOpen(false)
        await loadProjects()
      } catch (error) {
        setActionError(getErrorKey(error, 'error.projects.create'))
      } finally {
        setIsLoading(false)
      }
    },
    [candidateId, isAdminUser, loadProjects, showCandidateSelect],
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
        const tagIds = await resolveTagIds(getTagOptions(values))
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
    [editingProject],
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
      await Promise.all(selectedIds.map((id) => deleteProject(Number(id))))
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
      editingProject,
      canAccessProjects,
      canCreateProjects,
      showCandidateColumn,
      showCandidateSelect,
      createFormRef,
      editFormRef,
      loadTagOptions,
      loadCandidateOptions,
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
      editingProject,
      canAccessProjects,
      canCreateProjects,
      showCandidateColumn,
      showCandidateSelect,
      loadTagOptions,
      loadCandidateOptions,
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

  return <ProjectsTableContext.Provider value={value}>{children}</ProjectsTableContext.Provider>
}

export function useProjectsTable() {
  const context = useContext(ProjectsTableContext)

  if (!context) {
    throw new Error('useProjectsTable must be used within ProjectsTableProvider')
  }

  return context
}
