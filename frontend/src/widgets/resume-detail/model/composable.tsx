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
import { saveCandidateAttributeDrafts } from '@entities/profile'
import { $session, isAdmin, isRecruiter } from '@entities/user'
import { i18n } from '@shared/config/i18n'
import { getErrorKey } from '@shared/lib/errors'
import {
  type AttributeDraftValue,
  type ProfileAttributeDto,
  type ProjectDto,
  type ResumeLikeStateDto,
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
  canPublish: boolean
  canLike: boolean
  isAutosaveActive: boolean
  isDownloading: boolean
  setActionError: (error: string | null) => void
  setAutosaveActive: (active: boolean) => void
  saveAttributeValues: (
    items: Array<{ attributeId: number; value: AttributeDraftValue; version: number }>,
  ) => Promise<Record<number, number>>
  togglePublished: () => Promise<void>
  applyLikeState: (state: ResumeLikeStateDto) => void
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

  const canPublish = Boolean(
    resume && session && (isAdmin(session) || session.id === resume.candidateId),
  )
  const canEdit = Boolean(
    canPublish && !resume?.published,
  )
  
  const canLike = Boolean(resume?.published && isRecruiter(session))

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

  const saveAttributeValues = useCallback(
    async (items: Array<{ attributeId: number; value: AttributeDraftValue; version: number }>) => {
      if (!resume) {
        throw new Error('error.resumes.load')
      }

      return saveCandidateAttributeDrafts(resume.candidateId, resume.attributes, items)
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

  const applyLikeState = useCallback((state: ResumeLikeStateDto) => {
    setResume((current) =>
      current
        ? {
            ...current,
            likesCount: state.likesCount,
            likedByCurrentUser: state.likedByCurrentUser,
          }
        : current,
    )
  }, [])

  const downloadPdf = useCallback(async () => {
    if (!resume?.published) {
      return
    }

    setIsDownloading(true)
    setActionError(null)

    try {
      await downloadResumePdf(resume.id, i18n.language, window.location.origin)
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
      canPublish,
      canLike,
      isAutosaveActive,
      isDownloading,
      setActionError,
      setAutosaveActive,
      saveAttributeValues,
      togglePublished,
      applyLikeState,
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
      canPublish,
      canLike,
      isAutosaveActive,
      isDownloading,
      saveAttributeValues,
      togglePublished,
      applyLikeState,
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
