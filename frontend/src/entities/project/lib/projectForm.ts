import type { AbzaFormValues, AbzaSelectOption, ProjectDto } from '@shared/types'
import { createTag, fetchTags } from '@entities/tag'
import { deleteProjectTag, upsertProjectTag } from '../api/projectApi'
import { NEW_TAG_VALUE_PREFIX } from '@shared/ui/inputs/AsyncEntityTags'
import { toSubmitValues } from '@shared/lib/helpers'

export function getTagOptionsFromValues(values: AbzaFormValues): AbzaSelectOption[] {
  const value = values.tags
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (item): item is AbzaSelectOption =>
      typeof item === 'object' && item !== null && 'value' in item && 'label' in item,
  )
}

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
    tags: project.tags.map((tag) => ({
      value: String(tag.id),
      label: tag.name,
    })),
  }
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

export async function resolveTagIds(options: AbzaSelectOption[]) {
  const ids: number[] = []

  for (const option of options) {
    if (option.isNew || option.value.startsWith(NEW_TAG_VALUE_PREFIX)) {
      const name = option.label.trim()
      if (!name) {
        continue
      }

      const existing = await fetchTags({
        page: 1,
        size: 20,
        search: name,
        sortBy: 'name',
        sortDir: 'asc',
      })
      const match = existing.items.find((item) => item.name.toLowerCase() === name.toLowerCase())
      if (match) {
        ids.push(match.id)
        continue
      }

      const created = await createTag({ name })
      ids.push(created.id)
      continue
    }

    const id = Number(option.value)
    if (Number.isFinite(id)) {
      ids.push(id)
    }
  }

  return [...new Set(ids)]
}

export async function syncProjectTags(
  projectId: number,
  nextTagIds: number[],
  currentTagIds: number[] = [],
) {
  const desired = new Set(nextTagIds)
  const existing = new Set(currentTagIds)

  await Promise.all([
    ...[...desired]
      .filter((id) => !existing.has(id))
      .map((tagId) => upsertProjectTag(projectId, tagId)),
    ...[...existing]
      .filter((id) => !desired.has(id))
      .map((tagId) => deleteProjectTag(projectId, tagId)),
  ])
}
