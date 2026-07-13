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

export const ATTRIBUTE_VALUE_TYPES = [
  'string',
  'text',
  'number',
  'boolean',
  'date',
  'select',
  'period',
  'image',
  'file',
] as const
export const ATTRIBUTE_INPUT_TYPES = [
  'text',
  'textarea',
  'email',
  'image',
  'file',
  'number',
  'checkbox',
  'date',
  'select',
  'period',
] as const

export type AttributeValueType = (typeof ATTRIBUTE_VALUE_TYPES)[number]
export type AttributeInputType = (typeof ATTRIBUTE_INPUT_TYPES)[number]

export type FileAttributeValue = {
  uid: string
  url: string
  name: string
}

export type AttributeDraftValue = string | FileAttributeValue

export const MAX_ATTRIBUTE_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function isFileAttributeValue(value: unknown): value is FileAttributeValue {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<FileAttributeValue>
  return (
    typeof candidate.uid === 'string' &&
    candidate.uid.length > 0 &&
    typeof candidate.url === 'string' &&
    candidate.url.length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.length > 0
  )
}

export function toComparableAttributeValue(value: AttributeDraftValue | null | undefined): string {
  if (isFileAttributeValue(value)) {
    return value.uid
  }

  return typeof value === 'string' ? value : ''
}

export function toPersistedAttributeValue(value: AttributeDraftValue | null | undefined): string | null {
  const comparable = toComparableAttributeValue(value)
  return comparable === '' ? null : comparable
}
