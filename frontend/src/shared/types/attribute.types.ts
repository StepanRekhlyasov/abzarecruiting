export type AttributeDto = {
  id: number
  name: string
  description: string | null
  valueType: string
  inputType: string
  options: string[]
  createdAt: string
  version: number
}

export type CreateAttributeRequest = {
  name: string
  description?: string | null
  valueType: string
  options?: string[]
}

export type UpdateAttributeRequest = CreateAttributeRequest & {
  version: number
}

export type DeleteAttributeItem = {
  id: number
  version: number
}

export const ATTRIBUTE_VALUE_TYPES = ['string', 'text', 'number', 'boolean', 'date', 'select', 'period', 'image'] as const
export const ATTRIBUTE_INPUT_TYPES = ['text', 'textarea', 'image', 'number', 'checkbox', 'date', 'select', 'period'] as const

export type AttributeValueType = (typeof ATTRIBUTE_VALUE_TYPES)[number]
export type AttributeInputType = (typeof ATTRIBUTE_INPUT_TYPES)[number]
