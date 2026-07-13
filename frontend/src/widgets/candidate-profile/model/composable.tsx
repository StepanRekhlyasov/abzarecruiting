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
  fetchAttributes,
  linkAttributesToProfileBatch,
  unlinkAttributesFromProfileBatch,
} from '@entities/attribute'
import {
  createProject,
  fetchProject,
  fetchProjects,
  getTagOptionsFromValues,
  resolveTagIds,
  syncProjectTags,
  toProjectPayload,
  updateProject,
  type ProjectDto,
} from '@entities/project'
import {
  fetchMeInfo,
  setCandidateAttributeValue,
  type ProfileAttributeDto,
} from '@entities/profile'
import { fetchTags } from '@entities/tag'
import { getErrorKey } from '@shared/lib/errors'
import {
  toPersistedAttributeValue,
  type AbzaFormValues,
  type AbzaSelectOption,
  type AttributeDraftValue,
} from '@shared/types'

type CandidateProfileContextValue = {
  candidateId: string
  meAttributes: ProfileAttributeDto[]
  projects: ProjectDto[]
  isLoading: boolean
  isMutating: boolean
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
  loadAttributeOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  loadTagOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  addAttributesToProfile: (attributeIds: number[]) => Promise<void>
  removeAttributesFromProfile: (attributeIds: number[]) => Promise<void>
  reloadProfile: () => Promise<void>
  createCandidateProject: (values: AbzaFormValues) => Promise<void>
  updateCandidateProject: (projectId: number, values: AbzaFormValues, current: ProjectDto) => Promise<void>
}

const CandidateProfileContext = createContext<CandidateProfileContextValue | null>(null)

type CandidateProfileProviderProps = PropsWithChildren<{
  candidateId: string
}>

export function CandidateProfileProvider({ candidateId, children }: CandidateProfileProviderProps) {
  const [meAttributes, setMeAttributes] = useState<ProfileAttributeDto[]>([])
  const [projects, setProjects] = useState<ProjectDto[]>([])
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
      const [attributes, projectsResult] = await Promise.all([
        fetchMeInfo(candidateId, { signal }),
        fetchProjects(
          { page: 1, size: 100, sortBy: 'createdAt', sortDir: 'desc' },
          { signal, candidateId },
        ),
      ])

      if (!signal?.aborted) {
        setMeAttributes(attributes)
        setProjects(projectsResult.items)
      }
    } catch (loadError) {
      if (isAxiosError(loadError) && loadError.code === 'ERR_CANCELED') {
        return
      }

      if (!signal?.aborted) {
        setError(getErrorKey(loadError, 'error.profile.load'))
        setMeAttributes([])
        setProjects([])
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

  const loadAttributeOptions = useCallback(
    async (search: string, signal?: AbortSignal) => {
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

      return result.items
        .filter((item) => !linkedAttributeIdSet.has(item.id))
        .map((item) => ({
          value: String(item.id),
          label: item.name,
          valueType: item.valueType,
        }))
    },
    [linkedAttributeIdSet],
  )

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

  const createCandidateProject = useCallback(
    async (values: AbzaFormValues) => {
      setIsMutating(true)
      setActionError(null)

      try {
        const created = await createProject({
          ...toProjectPayload(values),
          candidateId,
        })
        const tagIds = await resolveTagIds(getTagOptionsFromValues(values))
        await syncProjectTags(created.id, tagIds)
        const refreshed = await fetchProject(created.id)
        setProjects((current) => [refreshed, ...current.filter((item) => item.id !== refreshed.id)])
      } catch (createError) {
        setActionError(getErrorKey(createError, 'error.projects.create'))
        throw createError
      } finally {
        setIsMutating(false)
      }
    },
    [candidateId],
  )

  const updateCandidateProject = useCallback(
    async (projectId: number, values: AbzaFormValues, current: ProjectDto) => {
      setIsMutating(true)
      setActionError(null)

      try {
        await updateProject(projectId, toProjectPayload(values))
        const tagIds = await resolveTagIds(getTagOptionsFromValues(values))
        await syncProjectTags(
          projectId,
          tagIds,
          current.tags.map((tag) => tag.id),
        )
        const refreshed = await fetchProject(projectId)
        setProjects((items) => items.map((item) => (item.id === refreshed.id ? refreshed : item)))
      } catch (updateError) {
        setActionError(getErrorKey(updateError, 'error.projects.update'))
        throw updateError
      } finally {
        setIsMutating(false)
      }
    },
    [],
  )

  const value = useMemo(
    () => ({
      candidateId,
      meAttributes,
      projects,
      isLoading,
      isMutating,
      error,
      actionError,
      isAutosaveActive,
      setActionError,
      setAutosaveActive,
      saveAttributeValue,
      loadAttributeOptions,
      loadTagOptions,
      addAttributesToProfile,
      removeAttributesFromProfile,
      reloadProfile: () => loadProfile(),
      createCandidateProject,
      updateCandidateProject,
    }),
    [
      candidateId,
      meAttributes,
      projects,
      isLoading,
      isMutating,
      error,
      actionError,
      isAutosaveActive,
      saveAttributeValue,
      loadAttributeOptions,
      loadTagOptions,
      addAttributesToProfile,
      removeAttributesFromProfile,
      loadProfile,
      createCandidateProject,
      updateCandidateProject,
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
