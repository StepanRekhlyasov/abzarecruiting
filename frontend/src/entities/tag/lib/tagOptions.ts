import type { AbzaFormValues, AbzaSelectOption } from '@shared/types'
import { NEW_TAG_VALUE_PREFIX } from '@shared/ui/inputs'
import { createTag, fetchTags } from '../api/tagApi'

export function isNewTagOption(option: AbzaSelectOption) {
  return Boolean(option.isNew) || option.value.startsWith(NEW_TAG_VALUE_PREFIX)
}

export function tagsToSelectOptions(tags: ReadonlyArray<{ id: number; name: string }>): AbzaSelectOption[] {
  return tags.map((tag) => ({
    value: String(tag.id),
    label: tag.name,
  }))
}

export function getTagOptionsFromValues(
  values: AbzaFormValues,
  fieldName = 'tags',
): AbzaSelectOption[] {
  const value = values[fieldName]
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (item): item is AbzaSelectOption =>
      typeof item === 'object' && item !== null && 'value' in item && 'label' in item,
  )
}

export async function loadTagOptions(
  search: string,
  signal?: AbortSignal,
): Promise<AbzaSelectOption[]> {
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

  return tagsToSelectOptions(result.items)
}

export async function ensureTagByName(name: string): Promise<AbzaSelectOption> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Tag name is required')
  }

  const existing = await fetchTags({
    page: 1,
    size: 20,
    search: trimmed,
    sortBy: 'name',
    sortDir: 'asc',
  })
  const match = existing.items.find((item) => item.name.toLowerCase() === trimmed.toLowerCase())
  if (match) {
    return { value: String(match.id), label: match.name }
  }

  const created = await createTag({ name: trimmed })
  return { value: String(created.id), label: created.name }
}

export async function resolveTagIds(options: AbzaSelectOption[]) {
  const ids: number[] = []

  for (const option of options) {
    if (isNewTagOption(option)) {
      const ensured = await ensureTagByName(option.label)
      ids.push(Number(ensured.value))
      continue
    }

    const id = Number(option.value)
    if (Number.isFinite(id)) {
      ids.push(id)
    }
  }

  return [...new Set(ids)]
}
