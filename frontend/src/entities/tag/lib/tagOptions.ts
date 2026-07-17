import type { AbzaFormValues, AbzaSelectOption } from '@shared/types'
import { ASYNC_ENTITY_TAGS_PAGE_SIZE, NEW_TAG_VALUE_PREFIX } from '@shared/ui/inputs'
import { ensureTags, fetchTags } from '../api/tagApi'

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
  page = 1,
) {
  const result = await fetchTags(
    {
      page,
      size: ASYNC_ENTITY_TAGS_PAGE_SIZE,
      search: search || undefined,
      sortBy: 'name',
      sortDir: 'asc',
    },
    { signal },
  )

  return {
    options: tagsToSelectOptions(result.items),
    hasMore: result.page * result.size < result.totalCount,
  }
}

export async function ensureTagByName(name: string): Promise<AbzaSelectOption> {
  const ensured = await ensureTagsByNames([name])
  const option = ensured[0]
  if (!option) {
    throw new Error('Tag name is required')
  }
  return option
}

export async function ensureTagsByNames(names: string[]): Promise<AbzaSelectOption[]> {
  const normalized = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
  if (normalized.length === 0) {
    return []
  }

  const tags = await ensureTags(normalized)
  const byName = new Map(tags.map((tag) => [tag.name.toLowerCase(), tag]))

  return normalized.map((name) => {
    const tag = byName.get(name.toLowerCase())
    if (!tag) {
      throw new Error(`Tag "${name}" was not created`)
    }
    return { value: String(tag.id), label: tag.name }
  })
}

export async function resolveTagIds(options: AbzaSelectOption[]) {
  const ids: number[] = []
  const newNames: string[] = []

  for (const option of options) {
    if (isNewTagOption(option)) {
      newNames.push(option.label)
      continue
    }

    const id = Number(option.value)
    if (Number.isFinite(id)) {
      ids.push(id)
    }
  }

  if (newNames.length > 0) {
    const ensured = await ensureTagsByNames(newNames)
    for (const option of ensured) {
      ids.push(Number(option.value))
    }
  }

  return [...new Set(ids)]
}

export async function resolveTagOptions(options: AbzaSelectOption[]): Promise<AbzaSelectOption[]> {
  const existing: AbzaSelectOption[] = []
  const newNames: string[] = []

  for (const option of options) {
    if (isNewTagOption(option)) {
      newNames.push(option.label)
      continue
    }
    existing.push(option)
  }

  const ensured = newNames.length > 0 ? await ensureTagsByNames(newNames) : []
  const unique = new Map<string, AbzaSelectOption>()

  for (const option of [...existing, ...ensured]) {
    unique.set(option.value, option)
  }

  return [...unique.values()]
}
