import type { FileAttributeValue } from './attribute.types'

export type ProfileAttributeDto = {
  id: number
  name: string
  description: string | null
  valueType: string
  inputType: string
  options: string[]
  value: string | FileAttributeValue | null
  version: number
  isDefault: boolean
}
