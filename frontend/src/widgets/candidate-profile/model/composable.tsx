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
  fetchMeInfo,
  setCandidateAttributeValue,
  type ProfileAttributeDto,
} from '@entities/profile'
import { getErrorKey } from '@shared/lib/errors'
import { toPersistedAttributeValue, type AttributeDraftValue } from '@shared/types'

type CandidateProfileContextValue = {
  candidateId: string
  meAttributes: ProfileAttributeDto[]
  isLoading: boolean
  error: string | null
  actionError: string | null
  isAutosaveActive: boolean
  setActionError: (error: string | null) => void
  setAutosaveActive: (active: boolean) => void
  saveAttributeValue: (
    attributeId: number,
    value: AttributeDraftValue,
    version: number,
  ) => Promise<number>
}

const CandidateProfileContext = createContext<CandidateProfileContextValue | null>(null)

type CandidateProfileProviderProps = PropsWithChildren<{
  candidateId: string
}>

export function CandidateProfileProvider({ candidateId, children }: CandidateProfileProviderProps) {
  const [meAttributes, setMeAttributes] = useState<ProfileAttributeDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isAutosaveActive, setAutosaveActive] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setActionError(null)
      setAutosaveActive(false)

      try {
        const attributes = await fetchMeInfo(candidateId, { signal: controller.signal })
        if (!controller.signal.aborted) {
          setMeAttributes(attributes)
        }
      } catch (loadError) {
        if (isAxiosError(loadError) && loadError.code === 'ERR_CANCELED') {
          return
        }

        if (!controller.signal.aborted) {
          setError(getErrorKey(loadError, 'error.profile.load'))
          setMeAttributes([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [candidateId])

  const saveAttributeValue = useCallback(
    async (attributeId: number, value: AttributeDraftValue, version: number) => {
      return setCandidateAttributeValue(
        attributeId,
        candidateId,
        toPersistedAttributeValue(value),
        version,
      )
    },
    [candidateId],
  )

  const value = useMemo(
    () => ({
      candidateId,
      meAttributes,
      isLoading,
      error,
      actionError,
      isAutosaveActive,
      setActionError,
      setAutosaveActive,
      saveAttributeValue,
    }),
    [candidateId, meAttributes, isLoading, error, actionError, isAutosaveActive, saveAttributeValue],
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
