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
import { useNavigate } from 'react-router-dom'
import type { AbzaFormValues } from '@features/abza-form'
import type { AbzaTableRowId } from '@features/abza-table'
import {
  changeUsersRoleBatch,
  createUser,
  deleteUsersBatch,
  fetchUsers,
  type UserListItem,
  type UserRole,
} from '@entities/user'
import type { SortDirection } from '@shared/types'
import { profileDetailPath } from '@shared/config/routes'
import { getErrorKey } from '@shared/lib/errors'
import { toSubmitString, toSubmitValues } from '@shared/lib/helpers'

function toCreateValues(values: AbzaFormValues) {
  const submitted = toSubmitValues(values, [
    'firstName',
    'lastName',
    'email',
    'password',
    'role',
  ])

  return {
    ...submitted,
    role: (submitted.role || 'Candidate') as UserRole,
  }
}

function toRoleValue(values: AbzaFormValues): UserRole {
  return (toSubmitString(values, 'role') || 'Candidate') as UserRole
}

type UsersTableContextValue = {
  rows: UserListItem[]
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
  isChangeRoleModalOpen: boolean
  createFormRef: RefObject<HTMLFormElement | null>
  changeRoleFormRef: RefObject<HTMLFormElement | null>
  setSearchInput: (value: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSelectedIds: (ids: AbzaTableRowId[]) => void
  setIsCreateModalOpen: (open: boolean) => void
  setIsChangeRoleModalOpen: (open: boolean) => void
  setActionError: (error: string | null) => void
  handleSortChange: (nextSortBy: string, nextSortDir: SortDirection) => void
  handleFilter: () => void
  handleCreateClick: () => void
  handleCreateSubmit: (values: AbzaFormValues) => Promise<void>
  handleChangeRoleSubmit: (values: AbzaFormValues) => Promise<void>
  handleCreateModalSubmit: () => void
  handleChangeRoleModalSubmit: () => void
  handleRowClick: (row: UserListItem) => void
  handleBulkChangeRoleClick: () => void
  handleDeleteSelected: () => Promise<void>
}

const UsersTableContext = createContext<UsersTableContextValue | null>(null)

export function UsersTableProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const createFormRef = useRef<HTMLFormElement>(null)
  const changeRoleFormRef = useRef<HTMLFormElement>(null)

  const [rows, setRows] = useState<UserListItem[]>([])
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
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false)

  const loadUsers = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setActionError(null)

    try {
      const result = await fetchUsers(
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
        setActionError(getErrorKey(error, 'profile.users.errors.load'))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [page, pageSize, searchQuery, sortBy, sortDir])

  useEffect(() => {
    const controller = new AbortController()
    void loadUsers(controller.signal)
    return () => controller.abort()
  }, [loadUsers])

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
        await createUser(toCreateValues(values))
        setIsCreateModalOpen(false)
        setPage(0)
        await loadUsers()
      } finally {
        setIsLoading(false)
      }
    },
    [loadUsers],
  )

  const handleChangeRoleSubmit = useCallback(
    async (values: AbzaFormValues) => {
      setIsLoading(true)

      try {
        await changeUsersRoleBatch({
          userIds: selectedIds.map(String),
          role: toRoleValue(values),
        })
        setSelectedIds([])
        setIsChangeRoleModalOpen(false)
        await loadUsers()
      } finally {
        setIsLoading(false)
      }
    },
    [loadUsers, selectedIds],
  )

  const handleCreateModalSubmit = useCallback(() => {
    createFormRef.current?.requestSubmit()
  }, [])

  const handleChangeRoleModalSubmit = useCallback(() => {
    changeRoleFormRef.current?.requestSubmit()
  }, [])

  const handleRowClick = useCallback(
    (row: UserListItem) => {
      navigate(profileDetailPath(row.id))
    },
    [navigate],
  )

  const handleBulkChangeRoleClick = useCallback(() => {
    setIsChangeRoleModalOpen(true)
  }, [])

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0) {
      return
    }

    setIsLoading(true)
    setActionError(null)

    try {
      await deleteUsersBatch(selectedIds.map(String))
      setSelectedIds([])
      await loadUsers()
    } catch (error) {
      setActionError(getErrorKey(error, 'profile.users.errors.delete'))
    } finally {
      setIsLoading(false)
    }
  }, [loadUsers, selectedIds])

  const value = useMemo(
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
      isChangeRoleModalOpen,
      createFormRef,
      changeRoleFormRef,
      setSearchInput,
      setPage,
      setPageSize,
      setSelectedIds,
      setIsCreateModalOpen,
      setIsChangeRoleModalOpen,
      setActionError,
      handleSortChange,
      handleFilter,
      handleCreateClick,
      handleCreateSubmit,
      handleChangeRoleSubmit,
      handleCreateModalSubmit,
      handleChangeRoleModalSubmit,
      handleRowClick,
      handleBulkChangeRoleClick,
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
      isChangeRoleModalOpen,
      handleSortChange,
      handleFilter,
      handleCreateClick,
      handleCreateSubmit,
      handleChangeRoleSubmit,
      handleCreateModalSubmit,
      handleChangeRoleModalSubmit,
      handleRowClick,
      handleBulkChangeRoleClick,
      handleDeleteSelected,
    ],
  )

  return <UsersTableContext.Provider value={value}>{children}</UsersTableContext.Provider>
}

export function useUsersTable() {
  const context = useContext(UsersTableContext)

  if (!context) {
    throw new Error('useUsersTable must be used within UsersTableProvider')
  }

  return context
}
