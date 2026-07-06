export type AbzaFieldType = 'email' | 'password' | 'text' | 'select'

export type AbzaValidationRule = {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  patternMessageKey?: string
}

export type AbzaSelectOption = {
  value: string
  label: string
}

export type AbzaFieldConfig = {
  name: string
  label: string
  type: AbzaFieldType
  validation?: AbzaValidationRule
  options?: AbzaSelectOption[]
  autoComplete?: string
  disabled?: boolean
}

export type AbzaFormConfig = {
  fields: AbzaFieldConfig[]
  submitLabel: string
}

export type AbzaFormValues = Record<string, string>

export type AbzaFormErrors = Record<string, string>
