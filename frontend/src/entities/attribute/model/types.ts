export type AttributeDto = {
  id: number
  name: string
  description: string | null
  valueType: string
  inputType: string
  options: string[]
  createdAt: string
}

export type CreateAttributeRequest = {
  name: string
  description?: string | null
  valueType: string
  options?: string[]
}

export type UpdateAttributeRequest = CreateAttributeRequest

export const ATTRIBUTE_VALUE_TYPES = ['string', 'text', 'number', 'boolean', 'date', 'select', 'period', 'image'] as const
export const ATTRIBUTE_INPUT_TYPES = ['text', 'textarea', 'image', 'number', 'checkbox', 'date', 'select', 'period'] as const

export type AttributeValueType = (typeof ATTRIBUTE_VALUE_TYPES)[number]
export type AttributeInputType = (typeof ATTRIBUTE_INPUT_TYPES)[number]

export const INPUT_TYPES_BY_VALUE_TYPE: Record<AttributeValueType, readonly AttributeInputType[]> = {
  string: ['text'],
  text: ['textarea'],
  number: ['number'],
  boolean: ['checkbox'],
  date: ['date'],
  select: ['select'],
  period: ['period'],
  image: ['image'],
}

export function getInputTypesForValueType(valueType: string): AttributeInputType[] {
  if (!ATTRIBUTE_VALUE_TYPES.includes(valueType as AttributeValueType)) {
    return []
  }

  return [...INPUT_TYPES_BY_VALUE_TYPE[valueType as AttributeValueType]]
}
