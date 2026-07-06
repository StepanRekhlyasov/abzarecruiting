export type AttributeDto = {
  id: number
  name: string
  description: string | null
  valueType: string
  inputType: string
  createdAt: string
}

export type CreateAttributeRequest = {
  name: string
  description?: string | null
  valueType: string
  inputType: string
}

export type UpdateAttributeRequest = CreateAttributeRequest

export const ATTRIBUTE_VALUE_TYPES = ['string', 'text', 'number', 'boolean', 'date'] as const
export const ATTRIBUTE_INPUT_TYPES = ['text', 'textarea', 'tel', 'image', 'number', 'checkbox', 'date'] as const

export type AttributeValueType = (typeof ATTRIBUTE_VALUE_TYPES)[number]
export type AttributeInputType = (typeof ATTRIBUTE_INPUT_TYPES)[number]

export const INPUT_TYPES_BY_VALUE_TYPE: Record<AttributeValueType, readonly AttributeInputType[]> = {
  string: ['text', 'tel', 'image'],
  text: ['textarea'],
  number: ['number'],
  boolean: ['checkbox'],
  date: ['date'],
}

export function getInputTypesForValueType(valueType: string): AttributeInputType[] {
  if (!ATTRIBUTE_VALUE_TYPES.includes(valueType as AttributeValueType)) {
    return []
  }

  return [...INPUT_TYPES_BY_VALUE_TYPE[valueType as AttributeValueType]]
}
