import type { AbzaFormValues, AbzaSelectOption, AttributeConditionDraft } from '@shared/types'
import type { PositionLevel, WorkFormat } from '@entities/position'
import {
  deletePositionAttribute,
  deletePositionTag,
  upsertPositionAttribute,
  upsertPositionTag,
} from '@entities/position'
import {
  createRestriction,
  deleteRestriction,
  updateRestriction,
} from '@entities/restriction'
import { toSubmitNumber, toSubmitValues } from '@shared/lib/helpers'
import type { PositionFormSubmitPayload } from '../ui/PositionFormModal'

export function toPositionSubmitValues(values: AbzaFormValues) {
  const { name, description, company, country, level, format } = toSubmitValues(values, [
    'name',
    'description',
    'company',
    'country',
    'level',
    'format',
  ])

  const maxProjectsRaw = toSubmitValues(values, ['maxProjects']).maxProjects

  return {
    name,
    description,
    company,
    country,
    level: level ? (level as PositionLevel) : null,
    format: format ? (format as WorkFormat) : null,
    maxProjects: maxProjectsRaw.trim() === '' ? 0 : toSubmitNumber(values, 'maxProjects'),
  }
}

function optionsToIds(options: AbzaSelectOption[]) {
  return options.map((option) => Number(option.value)).filter((id) => Number.isFinite(id))
}

export async function syncPositionRelations(
  positionId: number,
  nextAttributeIds: number[],
  nextTagIds: number[],
  currentAttributeIds: number[] = [],
  currentTagIds: number[] = [],
) {
  const desiredAttributes = new Set(nextAttributeIds)
  const desiredTags = new Set(nextTagIds)
  const existingAttributes = new Set(currentAttributeIds)
  const existingTags = new Set(currentTagIds)

  await Promise.all([
    ...[...desiredAttributes]
      .filter((id) => !existingAttributes.has(id))
      .map((attributeId) => upsertPositionAttribute(positionId, attributeId)),
    ...[...existingAttributes]
      .filter((id) => !desiredAttributes.has(id))
      .map((attributeId) => deletePositionAttribute(positionId, attributeId)),
    ...[...desiredTags]
      .filter((id) => !existingTags.has(id))
      .map((tagId) => upsertPositionTag(positionId, tagId)),
    ...[...existingTags]
      .filter((id) => !desiredTags.has(id))
      .map((tagId) => deletePositionTag(positionId, tagId)),
  ])
}

export async function syncPositionRestrictions(
  positionId: number,
  requiredTags: AbzaSelectOption[],
  attributeConditions: AttributeConditionDraft[],
  initialTagRestrictionIds: Map<number, { id: number; version: number }>,
  initialAttributeRestrictionIds: Map<string, { id: number; version: number }>,
) {
  const nextTagIds = new Set(optionsToIds(requiredTags))
  const tasks: Promise<unknown>[] = []

  for (const [tagId, meta] of initialTagRestrictionIds) {
    if (!nextTagIds.has(tagId)) {
      tasks.push(deleteRestriction(meta.id, meta.version))
    }
  }

  for (const tag of requiredTags) {
    const tagId = Number(tag.value)
    if (!Number.isFinite(tagId) || initialTagRestrictionIds.has(tagId)) {
      continue
    }

    tasks.push(
      createRestriction({
        positionId,
        tagId,
        condition: 'Exist',
      }),
    )
  }

  const keptLocalIds = new Set(attributeConditions.map((item) => item.localId))

  for (const [localId, meta] of initialAttributeRestrictionIds) {
    if (!keptLocalIds.has(localId)) {
      tasks.push(deleteRestriction(meta.id, meta.version))
    }
  }

  for (const condition of attributeConditions) {
    if (!condition.attributeId) {
      continue
    }

    const needsTarget =
      condition.condition === 'Equal' || condition.condition === 'More' || condition.condition === 'Less'
    const targetValue = needsTarget ? condition.targetValue.trim() : null

    if (needsTarget && !targetValue) {
      throw new Error('error.restrictions.targetValueRequired')
    }

    const existing = initialAttributeRestrictionIds.get(condition.localId)

    if (existing) {
      tasks.push(
        updateRestriction(existing.id, {
          positionId,
          attributeId: condition.attributeId,
          tagId: null,
          condition: condition.condition,
          targetValue,
          version: existing.version,
        }),
      )
      continue
    }

    tasks.push(
      createRestriction({
        positionId,
        attributeId: condition.attributeId,
        condition: condition.condition,
        targetValue,
      }),
    )
  }

  await Promise.all(tasks)
}

export function optionsFromPayload(payload: PositionFormSubmitPayload) {
  return {
    attributeIds: optionsToIds(payload.attributes),
    tagIds: optionsToIds(payload.tags),
  }
}
