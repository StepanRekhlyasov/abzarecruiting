import type { AttributeValidationDto, FileAttributeValue } from './attribute.types'

export type ProfileAttributeDto = {
  id: number
  name: string
  description: string | null
  category: string
  valueType: string
  inputType: string
  options: string[]
  validations: AttributeValidationDto[]
  value: string | FileAttributeValue | null
  version: number
  isDefault: boolean
}
