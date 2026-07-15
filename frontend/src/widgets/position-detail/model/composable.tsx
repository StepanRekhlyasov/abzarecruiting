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
import type {
  AbzaFormValues,
  AbzaSelectOption,
  AttributeConditionDraft,
  PositionMessageDto,
} from '@shared/types'
import { fetchAttributes } from '@entities/attribute'
import { fetchPosition, updatePosition } from '@entities/position'
import {
  createPositionMessage,
  deletePositionMessage,
  fetchPositionMessages,
} from '@entities/position-message'
import { fetchRestrictionsByPosition } from '@entities/restriction'
import { createResume, fetchResumes } from '@entities/resume'
import { getTagOptionsFromValues, resolveTagIds } from '@entities/tag'
import { $session, isAdmin, isCandidate, isRecruiterOrAdmin } from '@entities/user'
import { cvDetailPath } from '@shared/config/routes'
import { getErrorKey } from '@shared/lib/errors'
import { notificationsSocket } from '@shared/lib/websocket'
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
  canPostMessage: boolean
  canDeleteMessages: boolean
  canLinkCandidateProfile: boolean
  existingResumeId: number | null
  isEditModalOpen: boolean
  editDraft: EditDraftState | null
  tab: string
  messages: PositionMessageDto[]
  isMessagesLoading: boolean
  isMessageSubmitting: boolean
  messagesError: string | null
  setTab: (tab: string) => void
  setActionError: (error: string | null) => void
  setMessagesError: (error: string | null) => void
  setIsEditModalOpen: (open: boolean) => void
  handleEditClick: () => Promise<void>
  handleEditSubmit: (payload: PositionFormSubmitPayload) => Promise<void>
  handleDescriptionSubmit: (values: AbzaFormValues) => Promise<void>
  handleResumeAction: () => Promise<void>
  handleCreateMessage: (content: string) => Promise<void>
  handleDeleteMessage: (messageId: number) => Promise<void>
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
  const [messages, setMessages] = useState<PositionMessageDto[]>([])
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [isMessageSubmitting, setIsMessageSubmitting] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)

  const canEdit = isRecruiterOrAdmin(session)
  const canCreateResume = isCandidate(session)
  const canPostMessage = Boolean(session)
  const canDeleteMessages = isAdmin(session)
  const canLinkCandidateProfile = isRecruiterOrAdmin(session)

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

  const loadMessages = useCallback(
    async (signal?: AbortSignal) => {
      setIsMessagesLoading(true)
      setMessagesError(null)

      try {
        const items = await fetchPositionMessages(positionId, { signal })
        if (!signal?.aborted) {
          setMessages(items)
        }
      } catch (loadError) {
        if (isAxiosError(loadError) && loadError.code === 'ERR_CANCELED') {
          return
        }

        if (!signal?.aborted) {
          setMessagesError(getErrorKey(loadError, 'error.messages.load'))
          setMessages([])
        }
      } finally {
        if (!signal?.aborted) {
          setIsMessagesLoading(false)
        }
      }
    },
    [positionId],
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
    const controller = new AbortController()
    void loadMessages(controller.signal)
    return () => controller.abort()
  }, [loadMessages])

  useEffect(() => {
    return notificationsSocket.subscribe((event) => {
      if (event.positionId !== positionId) {
        return
      }

      setPosition((current) =>
        current ? { ...current, messagesCount: event.messagesCount } : current,
      )

      if (event.type === 'positionMessageCreated' && event.message) {
        setMessages((current) => {
          if (current.some((item) => item.id === event.message.id)) {
            return current
          }

          return [event.message, ...current]
        })
        return
      }

      if (event.type === 'positionMessageDeleted' && event.messageId != null) {
        setMessages((current) => current.filter((item) => item.id !== event.messageId))
      }
    })
  }, [positionId])

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

  const handleCreateMessage = useCallback(
    async (content: string) => {
      if (!canPostMessage) {
        return
      }

      setIsMessageSubmitting(true)
      setMessagesError(null)

      try {
        const created = await createPositionMessage(positionId, { content })
        setMessages((current) => {
          if (current.some((item) => item.id === created.id)) {
            return current
          }

          return [created, ...current]
        })
        setPosition((current) =>
          current ? { ...current, messagesCount: current.messagesCount + 1 } : current,
        )
      } catch (createError) {
        setMessagesError(getErrorKey(createError, 'error.messages.create'))
        throw createError
      } finally {
        setIsMessageSubmitting(false)
      }
    },
    [canPostMessage, positionId],
  )

  const handleDeleteMessage = useCallback(
    async (messageId: number) => {
      if (!canDeleteMessages) {
        return
      }

      setMessagesError(null)

      try {
        await deletePositionMessage(positionId, messageId)
        setMessages((current) => current.filter((item) => item.id !== messageId))
        setPosition((current) =>
          current
            ? { ...current, messagesCount: Math.max(0, current.messagesCount - 1) }
            : current,
        )
      } catch (deleteError) {
        setMessagesError(getErrorKey(deleteError, 'error.messages.delete'))
      }
    },
    [canDeleteMessages, positionId],
  )

  const value = useMemo(
    () => ({
      position,
      isLoading,
      isMutating,
      error,
      actionError,
      canEdit,
      canCreateResume,
      canPostMessage,
      canDeleteMessages,
      canLinkCandidateProfile,
      existingResumeId,
      isEditModalOpen,
      editDraft,
      tab,
      messages,
      isMessagesLoading,
      isMessageSubmitting,
      messagesError,
      setTab,
      setActionError,
      setMessagesError,
      setIsEditModalOpen,
      handleEditClick,
      handleEditSubmit,
      handleDescriptionSubmit,
      handleResumeAction,
      handleCreateMessage,
      handleDeleteMessage,
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
      canPostMessage,
      canDeleteMessages,
      canLinkCandidateProfile,
      existingResumeId,
      isEditModalOpen,
      editDraft,
      tab,
      messages,
      isMessagesLoading,
      isMessageSubmitting,
      messagesError,
      handleEditClick,
      handleEditSubmit,
      handleDescriptionSubmit,
      handleResumeAction,
      handleCreateMessage,
      handleDeleteMessage,
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
