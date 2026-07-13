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
import type { PositionDto, PositionLevel, WorkFormat } from '@entities/position'
import type {
  AbzaFormValues,
  AbzaSelectOption,
  AttributeConditionDraft,
  SortDirection,
} from '@shared/types'
import { fetchAttributes } from '@entities/attribute'
import {
  createPosition,
  deletePosition,
  deletePositionAttribute,
  deletePositionTag,
  fetchPosition,
  fetchPositions,
  updatePosition,
  upsertPositionAttribute,
  upsertPositionTag,
} from '@entities/position'
import {
  createRestriction,
  deleteRestriction,
  fetchRestrictionsByPosition,
  updateRestriction,
} from '@entities/restriction'
import { createResume, fetchResumePositionIds } from '@entities/resume'
import { fetchTags } from '@entities/tag'
import { $session, isCandidate, isRecruiterOrAdmin } from '@entities/user'
import { getErrorKey } from '@shared/lib/errors'
import { toSubmitNumber, toSubmitValues } from '@shared/lib/helpers'
import type { PositionFormSubmitPayload } from '../ui/PositionFormModal'
import { restrictionsToDrafts } from './lib'

function toPositionSubmitValues(values: AbzaFormValues) {
  const { name, description, company, country, level, format } = toSubmitValues(values, [
    'name',
    'description',
    'company',
    'country',
    'level',
    'format',
  ])

  const maxProjectsRaw = toSubmitValues(values, ['maxProjects']).maxProjects

  return {
    name,
    description,
    company,
    country,
    level: level ? (level as PositionLevel) : null,
    format: format ? (format as WorkFormat) : null,
    maxProjects: maxProjectsRaw.trim() === '' ? 0 : toSubmitNumber(values, 'maxProjects'),
  }
}

function optionsToIds(options: AbzaSelectOption[]) {
  return options.map((option) => Number(option.value)).filter((id) => Number.isFinite(id))
}

async function syncPositionRelations(
  positionId: number,
  nextAttributeIds: number[],
  nextTagIds: number[],
  currentAttributeIds: number[] = [],
  currentTagIds: number[] = [],
) {
  const desiredAttributes = new Set(nextAttributeIds)
  const desiredTags = new Set(nextTagIds)
  const existingAttributes = new Set(currentAttributeIds)
  const existingTags = new Set(currentTagIds)

  await Promise.all([
    ...[...desiredAttributes]
      .filter((id) => !existingAttributes.has(id))
      .map((attributeId) => upsertPositionAttribute(positionId, attributeId)),
    ...[...existingAttributes]
      .filter((id) => !desiredAttributes.has(id))
      .map((attributeId) => deletePositionAttribute(positionId, attributeId)),
    ...[...desiredTags]
      .filter((id) => !existingTags.has(id))
      .map((tagId) => upsertPositionTag(positionId, tagId)),
    ...[...existingTags]
      .filter((id) => !desiredTags.has(id))
      .map((tagId) => deletePositionTag(positionId, tagId)),
  ])
}

async function syncPositionRestrictions(
  positionId: number,
  requiredTags: AbzaSelectOption[],
  attributeConditions: AttributeConditionDraft[],
  initialTagRestrictionIds: Map<number, { id: number; version: number }>,
  initialAttributeRestrictionIds: Map<string, { id: number; version: number }>,
) {
  const nextTagIds = new Set(optionsToIds(requiredTags))
  const tasks: Promise<unknown>[] = []

  for (const [tagId, meta] of initialTagRestrictionIds) {
    if (!nextTagIds.has(tagId)) {
      tasks.push(deleteRestriction(meta.id, meta.version))
    }
  }

  for (const tag of requiredTags) {
    const tagId = Number(tag.value)
    if (!Number.isFinite(tagId) || initialTagRestrictionIds.has(tagId)) {
      continue
    }

    tasks.push(
      createRestriction({
        positionId,
        tagId,
        condition: 'Exist',
      }),
    )
  }

  const keptLocalIds = new Set(attributeConditions.map((item) => item.localId))

  for (const [localId, meta] of initialAttributeRestrictionIds) {
    if (!keptLocalIds.has(localId)) {
      tasks.push(deleteRestriction(meta.id, meta.version))
    }
  }

  for (const condition of attributeConditions) {
    if (!condition.attributeId) {
      continue
    }

    const needsTarget =
      condition.condition === 'Equal' || condition.condition === 'More' || condition.condition === 'Less'
    const targetValue = needsTarget ? condition.targetValue.trim() : null

    if (needsTarget && !targetValue) {
      throw new Error('error.restrictions.targetValueRequired')
    }

    const existing = initialAttributeRestrictionIds.get(condition.localId)

    if (existing) {
      tasks.push(
        updateRestriction(existing.id, {
          positionId,
          attributeId: condition.attributeId,
          tagId: null,
          condition: condition.condition,
          targetValue,
          version: existing.version,
        }),
      )
      continue
    }

    tasks.push(
      createRestriction({
        positionId,
        attributeId: condition.attributeId,
        condition: condition.condition,
        targetValue,
      }),
    )
  }

  await Promise.all(tasks)
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
  loadTagOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
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
        await syncPositionRelations(
          created.id,
          optionsToIds(payload.attributes),
          optionsToIds(payload.tags),
        )
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
        await syncPositionRelations(
          editingPosition.id,
          optionsToIds(payload.attributes),
          optionsToIds(payload.tags),
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
      await createResume(editingPosition.id)
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
      await Promise.all(positionIds.map((id) => createResume(id)))
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
      loadTagOptions,
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
      loadTagOptions,
      handleSortChange,
      handleFilter,
      handleCreateClick,
      handleCreateSubmit,
      handleEditSubmit,
      handleCreateResumeFromView,
      handleCreateResumesSelected,
      handleRowClick,
      handleDeleteSelected,
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
