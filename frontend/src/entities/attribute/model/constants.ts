import {
  ATTRIBUTE_INPUT_TYPES,
  ATTRIBUTE_VALUE_TYPES,
  type AttributeInputType,
  type AttributeValueType,
} from '@shared/types'

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

export { ATTRIBUTE_INPUT_TYPES, ATTRIBUTE_VALUE_TYPES }
