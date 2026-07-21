import type { AttributeDraftValue, ProfileAttributeDto } from '@shared/types'
import { toPersistedAttributeValue } from '@shared/types'
import { setCandidateAttributeValuesBatch } from '../api/profileApi'

export async function saveCandidateAttributeDrafts(
  candidateId: string,
  attributes: ReadonlyArray<Pick<ProfileAttributeDto, 'id' | 'valueType' | 'inputType'>>,
  items: Array<{ attributeId: number; value: AttributeDraftValue; version: number }>,
): Promise<Record<number, number>> {
  const results = await setCandidateAttributeValuesBatch(
    candidateId,
    items.map((item) => {
      const attribute = attributes.find((attr) => attr.id === item.attributeId)
      return {
        attributeId: item.attributeId,
        value: toPersistedAttributeValue(item.value, {
          valueType: attribute?.valueType,
          inputType: attribute?.inputType,
        }),
        version: item.version,
      }
    }),
  )

  return Object.fromEntries(results.map((item) => [item.attributeId, item.version]))
}
