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
import {
  downloadResumePdf,
  fetchResume,
  updateResume,
  type ResumeDto,
} from '@entities/resume'
import {
  setCandidateAttributeValue,
} from '@entities/profile'
import { $session, isAdmin } from '@entities/user'
import { i18n } from '@shared/config/i18n'
import { getErrorKey } from '@shared/lib/errors'
import {
  toPersistedAttributeValue,
  type AttributeDraftValue,
  type ProfileAttributeDto,
  type ProjectDto,
} from '@shared/types'

type ResumeDetailContextValue = {
  resume: ResumeDto | null
  attributes: ProfileAttributeDto[]
  projects: ProjectDto[]
  isLoading: boolean
  isMutating: boolean
  error: string | null
  actionError: string | null
  canEdit: boolean
  isAutosaveActive: boolean
  isDownloading: boolean
  setActionError: (error: string | null) => void
  setAutosaveActive: (active: boolean) => void
  saveAttributeValue: (
    attributeId: number,
    value: AttributeDraftValue,
    version: number,
  ) => Promise<number>
  togglePublished: () => Promise<void>
  downloadPdf: () => Promise<void>
  reloadResume: () => Promise<void>
}

const ResumeDetailContext = createContext<ResumeDetailContextValue | null>(null)

type ResumeDetailProviderProps = PropsWithChildren<{
  resumeId: number
}>

export function ResumeDetailProvider({ resumeId, children }: ResumeDetailProviderProps) {
  const session = useUnit($session)
  const [resume, setResume] = useState<ResumeDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isAutosaveActive, setAutosaveActive] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const canEdit = Boolean(
    resume && session && (isAdmin(session) || session.id === resume.candidateId),
  )

  const loadResume = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)
      setActionError(null)
      setAutosaveActive(false)

      try {
        const data = await fetchResume(resumeId, { signal })
        if (!signal?.aborted) {
          setResume(data)
        }
      } catch (loadError) {
        if (isAxiosError(loadError) && loadError.code === 'ERR_CANCELED') {
          return
        }

        if (!signal?.aborted) {
          setError(getErrorKey(loadError, 'error.resumes.load'))
          setResume(null)
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [resumeId],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadResume(controller.signal)
    return () => controller.abort()
  }, [loadResume])

  const saveAttributeValue = useCallback(
    async (attributeId: number, value: AttributeDraftValue, version: number) => {
      if (!resume) {
        throw new Error('error.resumes.load')
      }

      const attribute = resume.attributes.find((item) => item.id === attributeId)

      return setCandidateAttributeValue(
        attributeId,
        resume.candidateId,
        toPersistedAttributeValue(value, {
          valueType: attribute?.valueType,
          inputType: attribute?.inputType,
        }),
        version,
      )
    },
    [resume],
  )

  const togglePublished = useCallback(async () => {
    if (!resume) {
      return
    }

    setIsMutating(true)
    setActionError(null)

    try {
      const updated = await updateResume(resume.id, {
        published: !resume.published,
        version: resume.version,
      })
      setResume(updated)
    } catch (publishError) {
      setActionError(getErrorKey(publishError, 'error.resumes.update'))
      throw publishError
    } finally {
      setIsMutating(false)
    }
  }, [resume])

  const downloadPdf = useCallback(async () => {
    if (!resume?.published) {
      return
    }

    setIsDownloading(true)
    setActionError(null)

    try {
      await downloadResumePdf(resume.id, i18n.language)
    } catch (downloadError) {
      setActionError(getErrorKey(downloadError, 'error.resumes.download'))
      throw downloadError
    } finally {
      setIsDownloading(false)
    }
  }, [resume])

  const value = useMemo(
    () => ({
      resume,
      attributes: resume?.attributes ?? [],
      projects: resume?.projects ?? [],
      isLoading,
      isMutating,
      error,
      actionError,
      canEdit,
      isAutosaveActive,
      isDownloading,
      setActionError,
      setAutosaveActive,
      saveAttributeValue,
      togglePublished,
      downloadPdf,
      reloadResume: () => loadResume(),
    }),
    [
      resume,
      isLoading,
      isMutating,
      error,
      actionError,
      canEdit,
      isAutosaveActive,
      isDownloading,
      saveAttributeValue,
      togglePublished,
      downloadPdf,
      loadResume,
    ],
  )

  return <ResumeDetailContext.Provider value={value}>{children}</ResumeDetailContext.Provider>
}

export function useResumeDetail() {
  const context = useContext(ResumeDetailContext)

  if (!context) {
    throw new Error('useResumeDetail must be used within ResumeDetailProvider')
  }

  return context
}
