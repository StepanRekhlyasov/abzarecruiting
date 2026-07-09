import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { profileDetailPath } from '@shared/config/routes'
import type { CandidateListItem } from '@shared/types'

type CandidatesTableContextValue = {
  rows: CandidateListItem[]
  totalCount: number
  page: number
  pageSize: number
  searchInput: string
  isLoading: boolean
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSearchInput: (value: string) => void
  handleFilter: () => void
  handleRowClick: (candidate: CandidateListItem) => void
}

const CandidatesTableContext = createContext<CandidatesTableContextValue | null>(null)

export function CandidatesTableProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading] = useState(false)

  // Placeholder until candidates list API is connected
  const rows = useMemo<CandidateListItem[]>(() => [], [searchQuery, page, pageSize])
  const totalCount = 0

  const handleFilter = useCallback(() => {
    setSearchQuery(searchInput.trim())
    setPage(0)
  }, [searchInput])

  const handleRowClick = useCallback(
    (candidate: CandidateListItem) => {
      navigate(profileDetailPath(candidate.id))
    },
    [navigate],
  )

  const value = useMemo(
    () => ({
      rows,
      totalCount,
      page,
      pageSize,
      searchInput,
      isLoading,
      setPage,
      setPageSize,
      setSearchInput,
      handleFilter,
      handleRowClick,
    }),
    [
      rows,
      totalCount,
      page,
      pageSize,
      searchInput,
      isLoading,
      handleFilter,
      handleRowClick,
    ],
  )

  return (
    <CandidatesTableContext.Provider value={value}>{children}</CandidatesTableContext.Provider>
  )
}

export function useCandidatesTable() {
  const context = useContext(CandidatesTableContext)

  if (!context) {
    throw new Error('useCandidatesTable must be used within CandidatesTableProvider')
  }

  return context
}
