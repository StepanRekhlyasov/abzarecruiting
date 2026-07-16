export const RESTRICTION_CONDITIONS = ['Exist', 'Equal', 'More', 'Less'] as const
export type RestrictionCondition = (typeof RESTRICTION_CONDITIONS)[number]

export type RestrictionDto = {
  id: number
  positionId: number
  attributeId: number | null
  attributeName: string | null
  attributeValueType: string | null
  tagId: number | null
  tagName: string | null
  targetValue: string | null
  condition: RestrictionCondition
  createdAt: string
  createdById: string | null
  version: number
}

export type CreateRestrictionRequest = {
  positionId: number
  attributeId?: number | null
  tagId?: number | null
  targetValue?: string | null
  condition: RestrictionCondition
}

export type UpdateRestrictionRequest = CreateRestrictionRequest & {
  version: number
}

export type AttributeConditionDraft = {
  localId: string
  id?: number
  version?: number
  attributeId: number | null
  attributeName: string
  attributeValueType: string
  condition: RestrictionCondition
  targetValue: string
}

export type TagRestrictionDraft = {
  localId: string
  id?: number
  version?: number
  tagId: number
  tagName: string
}
