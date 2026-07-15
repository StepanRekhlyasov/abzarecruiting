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
import { useNavigate } from 'react-router-dom'
import { useUnit } from 'effector-react'
import type { PositionDto } from '@entities/position'
import type { AbzaFormValues, AbzaSelectOption, AttributeConditionDraft } from '@shared/types'
import { fetchAttributes } from '@entities/attribute'
import { fetchPosition, updatePosition } from '@entities/position'
import { fetchRestrictionsByPosition } from '@entities/restriction'
import { createResume, fetchResumes } from '@entities/resume'
import { getTagOptionsFromValues, resolveTagIds } from '@entities/tag'
import { $session, isCandidate, isRecruiterOrAdmin } from '@entities/user'
import { cvDetailPath } from '@shared/config/routes'
import { getErrorKey } from '@shared/lib/errors'
import {
  positionAttributesToOptions,
  positionTagsToOptions,
  positionToFormValues,
  positionToInfoFormValues,
  restrictionsToDrafts,
} from '../../positions-table/model'
import type { PositionFormSubmitPayload } from '../../positions-table/ui/PositionFormModal'
import {
  optionsFromPayload,
  syncPositionRelations,
  syncPositionRestrictions,
  toPositionSubmitValues,
} from '../../positions-table/model/sync'

type EditDraftState = {
  requiredTags: AbzaSelectOption[]
  attributeConditions: AttributeConditionDraft[]
  tagRestrictionIds: Map<number, { id: number; version: number }>
  attributeRestrictionIds: Map<string, { id: number; version: number }>
}

type PositionDetailContextValue = {
  position: PositionDto | null
  isLoading: boolean
  isMutating: boolean
  error: string | null
  actionError: string | null
  canEdit: boolean
  canCreateResume: boolean
  existingResumeId: number | null
  isEditModalOpen: boolean
  editDraft: EditDraftState | null
  tab: string
  setTab: (tab: string) => void
  setActionError: (error: string | null) => void
  setIsEditModalOpen: (open: boolean) => void
  handleEditClick: () => Promise<void>
  handleEditSubmit: (payload: PositionFormSubmitPayload) => Promise<void>
  handleDescriptionSubmit: (values: AbzaFormValues) => Promise<void>
  handleResumeAction: () => Promise<void>
  loadAttributeOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
}

const PositionDetailContext = createContext<PositionDetailContextValue | null>(null)

type PositionDetailProviderProps = PropsWithChildren<{
  positionId: number
}>

export function PositionDetailProvider({ positionId, children }: PositionDetailProviderProps) {
  const session = useUnit($session)
  const navigate = useNavigate()

  const [position, setPosition] = useState<PositionDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editDraft, setEditDraft] = useState<EditDraftState | null>(null)
  const [existingResumeId, setExistingResumeId] = useState<number | null>(null)
  const [tab, setTab] = useState('description')

  const canEdit = isRecruiterOrAdmin(session)
  const canCreateResume = isCandidate(session)

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

  const loadPosition = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)
      setActionError(null)

      try {
        const detail = await fetchPosition(positionId, { signal })
        if (!signal?.aborted) {
          setPosition(detail)
        }
      } catch (loadError) {
        if (isAxiosError(loadError) && loadError.code === 'ERR_CANCELED') {
          return
        }

        if (!signal?.aborted) {
          setError(getErrorKey(loadError, 'error.positions.load'))
          setPosition(null)
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [positionId],
  )

  const loadCandidateResume = useCallback(
    async (signal?: AbortSignal) => {
      if (!canCreateResume) {
        setExistingResumeId(null)
        return
      }

      try {
        const result = await fetchResumes(
          {
            page: 1,
            size: 100,
            sortBy: 'createdAt',
            sortDir: 'desc',
          },
          { signal },
        )

        if (signal?.aborted) {
          return
        }

        const match = result.items.find((item) => item.positionId === positionId)
        setExistingResumeId(match?.id ?? null)
      } catch (loadError) {
        if (isAxiosError(loadError) && loadError.code === 'ERR_CANCELED') {
          return
        }

        if (!signal?.aborted) {
          setExistingResumeId(null)
        }
      }
    },
    [canCreateResume, positionId],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadPosition(controller.signal)
    return () => controller.abort()
  }, [loadPosition])

  useEffect(() => {
    const controller = new AbortController()
    void loadCandidateResume(controller.signal)
    return () => controller.abort()
  }, [loadCandidateResume])

  useEffect(() => {
    if (!isEditModalOpen) {
      setEditDraft(null)
    }
  }, [isEditModalOpen])

  const handleEditClick = useCallback(async () => {
    if (!canEdit || !position) {
      return
    }

    setIsMutating(true)
    setActionError(null)

    try {
      const [detail, restrictions] = await Promise.all([
        fetchPosition(position.id),
        fetchRestrictionsByPosition(position.id),
      ])
      setPosition(detail)
      setEditDraft(restrictionsToDrafts(restrictions))
      setIsEditModalOpen(true)
    } catch (editError) {
      setActionError(getErrorKey(editError, 'error.positions.load'))
    } finally {
      setIsMutating(false)
    }
  }, [canEdit, position])

  const handleEditSubmit = useCallback(
    async (payload: PositionFormSubmitPayload) => {
      if (!position) {
        return
      }

      setIsMutating(true)
      setActionError(null)

      try {
        await updatePosition(position.id, {
          ...toPositionSubmitValues(payload.info),
          version: position.version,
        })
        const { attributeIds, tagIds } = await optionsFromPayload(payload)
        await syncPositionRelations(
          position.id,
          attributeIds,
          tagIds,
          position.attributes.map((item) => item.attributeId),
          position.tags.map((item) => item.tagId),
        )
        await syncPositionRestrictions(
          position.id,
          payload.requiredTags,
          payload.attributeConditions,
          payload.initialTagRestrictionIds,
          payload.initialAttributeRestrictionIds,
        )
        const refreshed = await fetchPosition(position.id)
        setPosition(refreshed)
        setIsEditModalOpen(false)
      } catch (submitError) {
        setActionError(getErrorKey(submitError, 'error.positions.update'))
        throw submitError
      } finally {
        setIsMutating(false)
      }
    },
    [position],
  )

  const handleDescriptionSubmit = useCallback(
    async (values: AbzaFormValues) => {
      if (!canEdit || !position) {
        return
      }

      setActionError(null)

      try {
        await updatePosition(position.id, {
          ...toPositionSubmitValues(values),
          version: position.version,
        })
        const attributes = getTagOptionsFromValues(values, 'attributes')
        const tags = getTagOptionsFromValues(values, 'tags')
        const attributeIds = attributes
          .map((item) => Number(item.value))
          .filter((id) => Number.isFinite(id))
        const tagIds = await resolveTagIds(tags)
        await syncPositionRelations(
          position.id,
          attributeIds,
          tagIds,
          position.attributes.map((item) => item.attributeId),
          position.tags.map((item) => item.tagId),
        )
        const refreshed = await fetchPosition(position.id)
        setPosition(refreshed)
      } catch (submitError) {
        setActionError(getErrorKey(submitError, 'error.positions.update'))
        throw submitError
      }
    },
    [canEdit, position],
  )

  const handleResumeAction = useCallback(async () => {
    if (!canCreateResume || !position) {
      return
    }

    if (existingResumeId != null) {
      navigate(cvDetailPath(existingResumeId))
      return
    }

    setIsMutating(true)
    setActionError(null)

    try {
      const created = await createResume({ positionId: position.id })
      setExistingResumeId(created.id)
      navigate(cvDetailPath(created.id))
    } catch (resumeError) {
      setActionError(getErrorKey(resumeError, 'error.resumes.create'))
    } finally {
      setIsMutating(false)
    }
  }, [canCreateResume, existingResumeId, navigate, position])

  const value = useMemo(
    () => ({
      position,
      isLoading,
      isMutating,
      error,
      actionError,
      canEdit,
      canCreateResume,
      existingResumeId,
      isEditModalOpen,
      editDraft,
      tab,
      setTab,
      setActionError,
      setIsEditModalOpen,
      handleEditClick,
      handleEditSubmit,
      handleDescriptionSubmit,
      handleResumeAction,
      loadAttributeOptions,
    }),
    [
      position,
      isLoading,
      isMutating,
      error,
      actionError,
      canEdit,
      canCreateResume,
      existingResumeId,
      isEditModalOpen,
      editDraft,
      tab,
      handleEditClick,
      handleEditSubmit,
      handleDescriptionSubmit,
      handleResumeAction,
      loadAttributeOptions,
    ],
  )

  return <PositionDetailContext.Provider value={value}>{children}</PositionDetailContext.Provider>
}

export function usePositionDetail() {
  const context = useContext(PositionDetailContext)

  if (!context) {
    throw new Error('usePositionDetail must be used within PositionDetailProvider')
  }

  return context
}

export {
  positionAttributesToOptions,
  positionTagsToOptions,
  positionToFormValues,
  positionToInfoFormValues,
}
