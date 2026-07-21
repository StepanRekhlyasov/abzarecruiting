import type { AbzaFormValues, AbzaSelectOption, AttributeConditionDraft } from '@shared/types'
import type { PositionDto, PositionLevel, WorkFormat } from '@entities/position'
import {
  fetchPosition,
  syncPositionRelations as syncPositionRelationsApi,
  updatePosition,
} from '@entities/position'
import { syncRestrictions } from '@entities/restriction'
import { getTagOptionsFromValues, resolveTagIds } from '@entities/tag'
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
  _currentAttributeIds: number[] = [],
  _currentTagIds: number[] = [],
) {
  await syncPositionRelationsApi(positionId, nextAttributeIds, nextTagIds)
}

export async function syncPositionRestrictions(
  positionId: number,
  requiredTags: AbzaSelectOption[],
  attributeConditions: AttributeConditionDraft[],
  initialTagRestrictionIds: Map<number, { id: number; version: number }>,
  initialAttributeRestrictionIds: Map<string, { id: number; version: number }>,
) {
  const items = [
    ...requiredTags.map((tag) => {
      const tagId = Number(tag.value)
      const existing = initialTagRestrictionIds.get(tagId)
      return {
        id: existing?.id,
        version: existing?.version,
        tagId,
        condition: 'Exist' as const,
        targetValue: null as string | null,
      }
    }),
    ...attributeConditions
      .filter((condition) => Boolean(condition.attributeId))
      .map((condition) => {
        const needsTarget =
          condition.condition === 'Equal'
          || condition.condition === 'More'
          || condition.condition === 'Less'
        const targetValue = needsTarget ? condition.targetValue.trim() : null

        if (needsTarget && !targetValue) {
          throw new Error('error.restrictions.targetValueRequired')
        }

        const existing = initialAttributeRestrictionIds.get(condition.localId)
        return {
          id: existing?.id,
          version: existing?.version,
          attributeId: condition.attributeId,
          condition: condition.condition,
          targetValue,
        }
      }),
  ]

  await syncRestrictions({
    positionId,
    items,
  })
}

export async function optionsFromPayload(payload: PositionFormSubmitPayload) {
  return {
    attributeIds: optionsToIds(payload.attributes),
    tagIds: await resolveTagIds(payload.tags),
  }
}

export async function optionsFromRelationValues(values: AbzaFormValues) {
  const attributes = getTagOptionsFromValues(values, 'attributes')
  const tags = getTagOptionsFromValues(values, 'tags')
  return {
    attributeIds: optionsToIds(attributes),
    tagIds: await resolveTagIds(tags),
  }
}

type PositionEditTarget = Pick<PositionDto, 'id' | 'version' | 'attributes' | 'tags'>

export async function savePositionFromFormPayload(
  position: PositionEditTarget,
  payload: PositionFormSubmitPayload,
): Promise<PositionDto> {
  await updatePosition(position.id, {
    ...toPositionSubmitValues(payload.info),
    version: position.version,
  })
  const { attributeIds, tagIds } = await optionsFromPayload(payload)
  await syncPositionRelations(
    position.id,
    attributeIds,
    tagIds,
    position.attributes.map((item) => item.attributeId),
    position.tags.map((item) => item.tagId),
  )
  await syncPositionRestrictions(
    position.id,
    payload.requiredTags,
    payload.attributeConditions,
    payload.initialTagRestrictionIds,
    payload.initialAttributeRestrictionIds,
  )
  return fetchPosition(position.id)
}
