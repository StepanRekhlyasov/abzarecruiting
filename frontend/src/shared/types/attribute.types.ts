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
  url: string
  fileName: string
}

export const MAX_ATTRIBUTE_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function serializeFileAttributeValue(value: FileAttributeValue): string {
  return JSON.stringify(value)
}

export function parseFileAttributeValue(value: string | null | undefined): FileAttributeValue | null {
  if (!value?.trim()) {
    return null
  }

  const trimmed = value.trim()

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<FileAttributeValue>
      if (typeof parsed.url === 'string' && parsed.url.length > 0) {
        return {
          url: parsed.url,
          fileName:
            typeof parsed.fileName === 'string' && parsed.fileName.length > 0
              ? parsed.fileName
              : fileNameFromUrl(parsed.url),
        }
      }
    } catch {
      return null
    }
  }

  if (trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed)) {
    return {
      url: trimmed,
      fileName: fileNameFromUrl(trimmed),
    }
  }

  return null
}

function fileNameFromUrl(url: string): string {
  try {
    const path = url.includes('://') ? new URL(url).pathname : url
    const segment = path.split('/').filter(Boolean).at(-1)
    return segment ? decodeURIComponent(segment) : 'file'
  } catch {
    return 'file'
  }
}

