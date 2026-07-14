export type AttributeDto = {
  id: number
  name: string
  description: string | null
  category: AttributeCategory
  valueType: string
  inputType: string
  options: string[]
  createdAt: string
  version: number
}

export type CreateAttributeRequest = {
  name: string
  description?: string | null
  category: AttributeCategory
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

export const ATTRIBUTE_CATEGORIES = [
  'personalInformation',
  'hardSkills',
  'softSkills',
  'domainKnowledge',
  'certification',
] as const

export type AttributeCategory = (typeof ATTRIBUTE_CATEGORIES)[number]

export function getAttributeCategoryOrder(category: string): number {
  const index = ATTRIBUTE_CATEGORIES.indexOf(category as AttributeCategory)
  return index < 0 ? Number.MAX_SAFE_INTEGER : index
}

export function groupAttributesByCategory<T extends { category: string }>(attributes: T[]) {
  const groups = new Map<string, T[]>()

  for (const attribute of attributes) {
    const current = groups.get(attribute.category) ?? []
    current.push(attribute)
    groups.set(attribute.category, current)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => getAttributeCategoryOrder(left) - getAttributeCategoryOrder(right))
    .map(([category, items]) => ({ category, attributes: items }))
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

export function toPersistedAttributeValue(
  value: AttributeDraftValue | null | undefined,
  options?: { valueType?: string; inputType?: string },
): string | null {
  const comparable = toComparableAttributeValue(value)
  if (comparable === '') {
    return null
  }

  const isNumber =
    options?.valueType?.toLowerCase() === 'number' || options?.inputType?.toLowerCase() === 'number'

  if (isNumber) {
    return formatNumberAttributeValue(comparable)
  }

  return comparable
}

export function formatNumberAttributeValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : ''
  }

  const raw = String(value).trim().replace(',', '.')
  if (raw === '') {
    return ''
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return raw
  }

  return String(parsed)
}

export function toAttributeDraftValue(attribute: {
  value: string | FileAttributeValue | null
  valueType: string
  inputType: string
}): AttributeDraftValue {
  if (isFileAttributeValue(attribute.value)) {
    return attribute.value
  }

  const isNumber =
    attribute.valueType.toLowerCase() === 'number' || attribute.inputType.toLowerCase() === 'number'

  if (isNumber) {
    return formatNumberAttributeValue(attribute.value)
  }

  return (attribute.value ?? '') as string
}
