import type { AbzaFormValues, ProjectDto } from '@shared/types'
import { syncProjectTags as syncProjectTagsApi } from '../api/projectApi'
import { toSubmitValues } from '@shared/lib/helpers'

export function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

export function projectToFormValues(project: ProjectDto): AbzaFormValues {
  return {
    name: project.name,
    description: project.description,
    startAt: toDateInputValue(project.startAt),
    endAt: toDateInputValue(project.endAt),
  }
}

export function projectTagsToOptions(project: ProjectDto) {
  return project.tags.map((tag) => ({
    value: String(tag.id),
    label: tag.name,
  }))
}

export function toIsoDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return `${trimmed}T00:00:00.000Z`
}

export function toProjectPayload(values: AbzaFormValues) {
  const submitted = toSubmitValues(values, ['name', 'description', 'startAt', 'endAt'] as const)
  const endAt = submitted.endAt.trim()

  return {
    name: submitted.name,
    description: submitted.description,
    startAt: toIsoDate(submitted.startAt)!,
    endAt: endAt ? toIsoDate(endAt) : null,
  }
}

export async function syncProjectTags(
  projectId: number,
  nextTagIds: number[],
  _currentTagIds: number[] = [],
) {
  await syncProjectTagsApi(projectId, nextTagIds)
}
