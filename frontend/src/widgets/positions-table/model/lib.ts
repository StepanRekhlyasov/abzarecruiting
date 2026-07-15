import type { AbzaFormValues, AbzaSelectOption, AttributeConditionDraft, RestrictionDto } from '@shared/types'
import type { PositionDto } from '@entities/position'

export function positionToInfoFormValues(position: PositionDto): AbzaFormValues {
  return {
    name: position.name,
    description: position.description ?? '',
    company: position.company,
    country: position.country,
    level: position.level,
    format: position.format,
    maxProjects: String(position.maxProjects),
  }
}

export function positionToFormValues(position: PositionDto): AbzaFormValues {
  return {
    ...positionToInfoFormValues(position),
    attributes: positionAttributesToOptions(position),
    tags: positionTagsToOptions(position),
  }
}

export function positionAttributesToOptions(position: PositionDto): AbzaSelectOption[] {
  return position.attributes.map((item) => ({
    value: String(item.attributeId),
    label: item.name,
  }))
}

export function positionTagsToOptions(position: PositionDto): AbzaSelectOption[] {
  return position.tags.map((item) => ({
    value: String(item.tagId),
    label: item.name,
  }))
}

export function restrictionsToDrafts(restrictions: RestrictionDto[]) {
  const requiredTags: AbzaSelectOption[] = []
  const tagRestrictionIds = new Map<number, { id: number; version: number }>()
  const attributeConditions: AttributeConditionDraft[] = []
  const attributeRestrictionIds = new Map<string, { id: number; version: number }>()

  for (const restriction of restrictions) {
    if (restriction.tagId != null && restriction.condition === 'Exist') {
      requiredTags.push({
        value: String(restriction.tagId),
        label: restriction.tagName ?? String(restriction.tagId),
      })
      tagRestrictionIds.set(restriction.tagId, {
        id: restriction.id,
        version: restriction.version,
      })
      continue
    }

    if (restriction.attributeId != null) {
      const localId = crypto.randomUUID()
      attributeConditions.push({
        localId,
        id: restriction.id,
        version: restriction.version,
        attributeId: restriction.attributeId,
        attributeName: restriction.attributeName ?? String(restriction.attributeId),
        attributeValueType: restriction.attributeValueType ?? '',
        condition: restriction.condition,
        targetValue: restriction.targetValue ?? '',
      })
      attributeRestrictionIds.set(localId, {
        id: restriction.id,
        version: restriction.version,
      })
    }
  }

  return {
    requiredTags,
    attributeConditions,
    tagRestrictionIds,
    attributeRestrictionIds,
  }
}
