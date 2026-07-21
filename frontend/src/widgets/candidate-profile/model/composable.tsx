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
import {
  linkAttributesToProfileBatch,
  loadAttributeOptions as fetchAttributeOptions,
  unlinkAttributesFromProfileBatch,
} from '@entities/attribute'
import {
  fetchMeInfo,
  saveCandidateAttributeDrafts,
  type ProfileAttributeDto,
} from '@entities/profile'
import { getErrorKey } from '@shared/lib/errors'
import {
  type AsyncEntityLoadOptions,
  type AttributeDraftValue,
} from '@shared/types'

type CandidateProfileContextValue = {
  candidateId: string
  meAttributes: ProfileAttributeDto[]
  isLoading: boolean
  isMutating: boolean
  error: string | null
  actionError: string | null
  isAutosaveActive: boolean
  setActionError: (error: string | null) => void
  setAutosaveActive: (active: boolean) => void
  saveAttributeValues: (
    items: Array<{ attributeId: number; value: AttributeDraftValue; version: number }>,
  ) => Promise<Record<number, number>>
  loadAttributeOptions: AsyncEntityLoadOptions
  addAttributesToProfile: (attributeIds: number[]) => Promise<void>
  removeAttributesFromProfile: (attributeIds: number[]) => Promise<void>
  reloadProfile: () => Promise<void>
}

const CandidateProfileContext = createContext<CandidateProfileContextValue | null>(null)

type CandidateProfileProviderProps = PropsWithChildren<{
  candidateId: string
}>

export function CandidateProfileProvider({ candidateId, children }: CandidateProfileProviderProps) {
  const [meAttributes, setMeAttributes] = useState<ProfileAttributeDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isAutosaveActive, setAutosaveActive] = useState(false)

  const linkedAttributeIdSet = useMemo(
    () => new Set(meAttributes.map((attribute) => attribute.id)),
    [meAttributes],
  )

  const loadProfile = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setError(null)
    setActionError(null)
    setAutosaveActive(false)

    try {
      const attributes = await fetchMeInfo(candidateId, { signal })

      if (!signal?.aborted) {
        setMeAttributes(attributes)
      }
    } catch (loadError) {
      if (isAxiosError(loadError) && loadError.code === 'ERR_CANCELED') {
        return
      }

      if (!signal?.aborted) {
        setError(getErrorKey(loadError, 'error.profile.load'))
        setMeAttributes([])
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [candidateId])

  useEffect(() => {
    const controller = new AbortController()
    void loadProfile(controller.signal)
    return () => controller.abort()
  }, [loadProfile])

  const saveAttributeValues = useCallback(
    async (items: Array<{ attributeId: number; value: AttributeDraftValue; version: number }>) => {
      return saveCandidateAttributeDrafts(candidateId, meAttributes, items)
    },
    [candidateId, meAttributes],
  )

  const loadAttributeOptions = useCallback(
    async (search: string, signal?: AbortSignal, page = 1) =>
      fetchAttributeOptions(search, signal, page, { excludeIds: linkedAttributeIdSet }),
    [linkedAttributeIdSet],
  )

  const addAttributesToProfile = useCallback(
    async (attributeIds: number[]) => {
      if (attributeIds.length === 0) {
        return
      }

      setIsMutating(true)
      setActionError(null)

      try {
        await linkAttributesToProfileBatch(attributeIds, candidateId)
        const attributes = await fetchMeInfo(candidateId)
        setMeAttributes(attributes)
      } catch (linkError) {
        setActionError(getErrorKey(linkError, 'error.attributes.link'))
        throw linkError
      } finally {
        setIsMutating(false)
      }
    },
    [candidateId],
  )

  const removeAttributesFromProfile = useCallback(
    async (attributeIds: number[]) => {
      if (attributeIds.length === 0) {
        return
      }

      setIsMutating(true)
      setActionError(null)

      try {
        await unlinkAttributesFromProfileBatch(attributeIds, candidateId)
        const attributes = await fetchMeInfo(candidateId)
        setMeAttributes(attributes)
      } catch (unlinkError) {
        setActionError(getErrorKey(unlinkError, 'error.attributes.unlink'))
        throw unlinkError
      } finally {
        setIsMutating(false)
      }
    },
    [candidateId],
  )

  const value = useMemo(
    () => ({
      candidateId,
      meAttributes,
      isLoading,
      isMutating,
      error,
      actionError,
      isAutosaveActive,
      setActionError,
      setAutosaveActive,
      saveAttributeValues,
      loadAttributeOptions,
      addAttributesToProfile,
      removeAttributesFromProfile,
      reloadProfile: () => loadProfile(),
    }),
    [
      candidateId,
      meAttributes,
      isLoading,
      isMutating,
      error,
      actionError,
      isAutosaveActive,
      saveAttributeValues,
      loadAttributeOptions,
      addAttributesToProfile,
      removeAttributesFromProfile,
      loadProfile,
    ],
  )

  return (
    <CandidateProfileContext.Provider value={value}>{children}</CandidateProfileContext.Provider>
  )
}

export function useCandidateProfile() {
  const context = useContext(CandidateProfileContext)

  if (!context) {
    throw new Error('useCandidateProfile must be used within CandidateProfileProvider')
  }

  return context
}
