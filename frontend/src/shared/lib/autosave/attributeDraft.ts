import type { AttributeDraftValue, ProfileAttributeDto } from '@shared/types'
import { toAttributeDraftValue, toComparableAttributeValue } from '@shared/types'

export const AUTOSAVE_DELAY_MS = 5000

export function toAttributeDraftMap(
  attributes: ReadonlyArray<ProfileAttributeDto>,
): Record<number, AttributeDraftValue> {
  return Object.fromEntries(
    attributes.map((attribute) => [attribute.id, toAttributeDraftValue(attribute)]),
  )
}

export function toAttributeVersionMap(
  attributes: ReadonlyArray<{ id: number; version: number }>,
): Record<number, number> {
  return Object.fromEntries(attributes.map((attribute) => [attribute.id, attribute.version]))
}

export function getDirtyAttributeIds(
  draft: Record<number, AttributeDraftValue>,
  saved: Record<number, AttributeDraftValue>,
) {
  return Object.keys(draft)
    .map(Number)
    .filter(
      (attributeId) =>
        toComparableAttributeValue(draft[attributeId]) !==
        toComparableAttributeValue(saved[attributeId]),
    )
}
