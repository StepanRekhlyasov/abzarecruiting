import type { AbzaSelectOption } from '@shared/types'
import { ASYNC_ENTITY_TAGS_PAGE_SIZE } from '@shared/ui/inputs'
import { fetchAttributes } from '../api/attributeApi'

export function attributesToSelectOptions(
  attributes: ReadonlyArray<{ id: number; name: string; valueType?: string }>,
): AbzaSelectOption[] {
  return attributes.map((item) => ({
    value: String(item.id),
    label: item.name,
    valueType: item.valueType,
  }))
}

type LoadAttributeOptionsParams = {
  excludeIds?: ReadonlySet<number> | ReadonlyArray<number>
}

export async function loadAttributeOptions(
  search: string,
  signal?: AbortSignal,
  page = 1,
  params: LoadAttributeOptionsParams = {},
) {
  const excludeIds = params.excludeIds
    ? params.excludeIds instanceof Set
      ? params.excludeIds
      : new Set(params.excludeIds)
    : null

  const result = await fetchAttributes(
    {
      page,
      size: ASYNC_ENTITY_TAGS_PAGE_SIZE,
      search: search || undefined,
      sortBy: 'name',
      sortDir: 'asc',
    },
    { signal },
  )

  const items = excludeIds
    ? result.items.filter((item) => !excludeIds.has(item.id))
    : result.items

  return {
    options: attributesToSelectOptions(items),
    hasMore: result.page * result.size < result.totalCount,
  }
}
