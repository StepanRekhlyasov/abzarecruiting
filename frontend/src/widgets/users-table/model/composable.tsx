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
  sendUserActivationEmail,
  setUserActivation,
  setUserLockout,
  $session,
  isAdmin,
  type UserListItem,
  type UserRole,
} from '@entities/user'
import { useUnit } from 'effector-react'
import type { SortDirection } from '@shared/types'
import { profileDetailPath } from '@shared/config/routes'
import { getErrorKey } from '@shared/lib/errors'
import { toSubmitString, toSubmitValues } from '@shared/lib/helpers'

export type UserTableFilters = {
  role: string
  isLockedOut: string
  emailConfirmed: string
}

export const EMPTY_USER_FILTERS: UserTableFilters = {
  role: '',
  isLockedOut: '',
  emailConfirmed: '',
}

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

function toOptionalBoolean(value: string): boolean | undefined {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return undefined
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
  manageSuccess: string | null
  isCreateModalOpen: boolean
  isChangeRoleModalOpen: boolean
  isManageModalOpen: boolean
  isFilterModalOpen: boolean
  appliedFilters: UserTableFilters
  isFilterActive: boolean
  managedUser: UserListItem | null
  canManageUsers: boolean
  createFormRef: RefObject<HTMLFormElement | null>
  changeRoleFormRef: RefObject<HTMLFormElement | null>
  setSearchInput: (value: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSelectedIds: (ids: AbzaTableRowId[]) => void
  setIsCreateModalOpen: (open: boolean) => void
  setIsChangeRoleModalOpen: (open: boolean) => void
  setIsManageModalOpen: (open: boolean) => void
  setIsFilterModalOpen: (open: boolean) => void
  setActionError: (error: string | null) => void
  setManageSuccess: (message: string | null) => void
  handleSortChange: (nextSortBy: string, nextSortDir: SortDirection) => void
  handleFilter: () => void
  handleApplyFilters: (filters: UserTableFilters) => void
  handleResetFilters: () => void
  handleCreateClick: () => void
  handleCreateSubmit: (values: AbzaFormValues) => Promise<void>
  handleChangeRoleSubmit: (values: AbzaFormValues) => Promise<void>
  handleCreateModalSubmit: () => void
  handleChangeRoleModalSubmit: () => void
  handleRowClick: (row: UserListItem) => void
  handleBulkChangeRoleClick: () => void
  handleOpenCandidateProfile: () => void
  handleSetLockout: (locked: boolean) => Promise<void>
  handleSetActivation: (activated: boolean) => Promise<void>
  handleSendActivationEmail: () => Promise<void>
  handleDeleteSelected: () => Promise<void>
}

const UsersTableContext = createContext<UsersTableContextValue | null>(null)

export function UsersTableProvider({ children }: PropsWithChildren) {
  const session = useUnit($session)
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
  const [manageSuccess, setManageSuccess] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<UserTableFilters>(EMPTY_USER_FILTERS)
  const [managedUserId, setManagedUserId] = useState<string | null>(null)

  const canManageUsers = isAdmin(session)
  const isFilterActive = Boolean(
    appliedFilters.role || appliedFilters.isLockedOut || appliedFilters.emailConfirmed,
  )

  const managedUser = useMemo(
    () => (managedUserId ? rows.find((row) => row.id === managedUserId) ?? null : null),
    [managedUserId, rows],
  )

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
          role: appliedFilters.role || undefined,
          isLockedOut: toOptionalBoolean(appliedFilters.isLockedOut),
          emailConfirmed: toOptionalBoolean(appliedFilters.emailConfirmed),
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
  }, [appliedFilters, page, pageSize, searchQuery, sortBy, sortDir])

  useEffect(() => {
    const controller = new AbortController()
    void loadUsers(controller.signal)
    return () => controller.abort()
  }, [loadUsers])

  const handleFilter = useCallback(() => {
    setSearchQuery(searchInput.trim())
    setPage(0)
  }, [searchInput])

  const handleApplyFilters = useCallback((filters: UserTableFilters) => {
    setAppliedFilters(filters)
    setIsFilterModalOpen(false)
    setPage(0)
  }, [])

  const handleResetFilters = useCallback(() => {
    setAppliedFilters(EMPTY_USER_FILTERS)
    setIsFilterModalOpen(false)
    setPage(0)
  }, [])

  const handleSortChange = useCallback((nextSortBy: string, nextSortDir: SortDirection) => {
    setSortBy(nextSortBy)
    setSortDir(nextSortDir)
    setPage(0)
  }, [])

  const handleCreateClick = useCallback(() => {
    if (!canManageUsers) {
      return
    }

    setIsCreateModalOpen(true)
  }, [canManageUsers])

  const handleCreateSubmit = useCallback(
    async (values: AbzaFormValues) => {
      if (!canManageUsers) {
        return
      }

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
    [canManageUsers, loadUsers],
  )

  const handleChangeRoleSubmit = useCallback(
    async (values: AbzaFormValues) => {
      if (!canManageUsers) {
        return
      }

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
    [canManageUsers, loadUsers, selectedIds],
  )

  const handleCreateModalSubmit = useCallback(() => {
    createFormRef.current?.requestSubmit()
  }, [])

  const handleChangeRoleModalSubmit = useCallback(() => {
    changeRoleFormRef.current?.requestSubmit()
  }, [])

  const handleRowClick = useCallback(
    (row: UserListItem) => {
      if (canManageUsers) {
        setManagedUserId(row.id)
        setManageSuccess(null)
        setActionError(null)
        setIsManageModalOpen(true)
        return
      }

      if (row.role !== 'Candidate') {
        return
      }

      navigate(profileDetailPath(row.id))
    },
    [canManageUsers, navigate],
  )

  const handleOpenCandidateProfile = useCallback(() => {
    if (!managedUser || managedUser.role !== 'Candidate') {
      return
    }

    setIsManageModalOpen(false)
    navigate(profileDetailPath(managedUser.id))
  }, [managedUser, navigate])

  const handleBulkChangeRoleClick = useCallback(() => {
    if (!canManageUsers) {
      return
    }

    setIsChangeRoleModalOpen(true)
  }, [canManageUsers])

  const runManageAction = useCallback(
    async (action: (userId: string) => Promise<void>, successKey: string) => {
      if (!canManageUsers || !managedUserId) {
        return
      }

      setIsLoading(true)
      setActionError(null)
      setManageSuccess(null)

      try {
        await action(managedUserId)
        setManageSuccess(successKey)
        await loadUsers()
      } catch (error) {
        setActionError(getErrorKey(error, 'profile.users.errors.manage'))
      } finally {
        setIsLoading(false)
      }
    },
    [canManageUsers, loadUsers, managedUserId],
  )

  const handleSetLockout = useCallback(
    async (locked: boolean) => {
      await runManageAction(
        (userId) => setUserLockout(userId, locked),
        locked ? 'profile.users.manage.locked' : 'profile.users.manage.unlocked',
      )
    },
    [runManageAction],
  )

  const handleSetActivation = useCallback(
    async (activated: boolean) => {
      await runManageAction(
        (userId) => setUserActivation(userId, activated),
        activated ? 'profile.users.manage.activated' : 'profile.users.manage.deactivated',
      )
    },
    [runManageAction],
  )

  const handleSendActivationEmail = useCallback(async () => {
    await runManageAction(
      (userId) => sendUserActivationEmail(userId, window.location.origin),
      'profile.users.manage.activationEmailSent',
    )
  }, [runManageAction])

  const handleDeleteSelected = useCallback(async () => {
    if (!canManageUsers || selectedIds.length === 0) {
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
  }, [canManageUsers, loadUsers, selectedIds])

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
      manageSuccess,
      isCreateModalOpen,
      isChangeRoleModalOpen,
      isManageModalOpen,
      isFilterModalOpen,
      appliedFilters,
      isFilterActive,
      managedUser,
      canManageUsers,
      createFormRef,
      changeRoleFormRef,
      setSearchInput,
      setPage,
      setPageSize,
      setSelectedIds,
      setIsCreateModalOpen,
      setIsChangeRoleModalOpen,
      setIsManageModalOpen,
      setIsFilterModalOpen,
      setActionError,
      setManageSuccess,
      handleSortChange,
      handleFilter,
      handleApplyFilters,
      handleResetFilters,
      handleCreateClick,
      handleCreateSubmit,
      handleChangeRoleSubmit,
      handleCreateModalSubmit,
      handleChangeRoleModalSubmit,
      handleRowClick,
      handleBulkChangeRoleClick,
      handleOpenCandidateProfile,
      handleSetLockout,
      handleSetActivation,
      handleSendActivationEmail,
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
      manageSuccess,
      isCreateModalOpen,
      isChangeRoleModalOpen,
      isManageModalOpen,
      isFilterModalOpen,
      appliedFilters,
      isFilterActive,
      managedUser,
      canManageUsers,
      handleSortChange,
      handleFilter,
      handleApplyFilters,
      handleResetFilters,
      handleCreateClick,
      handleCreateSubmit,
      handleChangeRoleSubmit,
      handleCreateModalSubmit,
      handleChangeRoleModalSubmit,
      handleRowClick,
      handleBulkChangeRoleClick,
      handleOpenCandidateProfile,
      handleSetLockout,
      handleSetActivation,
      handleSendActivationEmail,
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
