import type { AbzaFieldConfig, AbzaFormErrors, AbzaFormValues } from '../model/types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ValidateOptions = {
  required: string
  minLength: (min: number) => string
  maxLength: (max: number) => string
  email: string
  pattern: (key?: string) => string
}

export function validateAbzaForm(
  fields: AbzaFieldConfig[],
  values: AbzaFormValues,
  messages: ValidateOptions,
): AbzaFormErrors {
  const errors: AbzaFormErrors = {}

  for (const field of fields) {
    const value = values[field.name] ?? ''
    const rules = field.validation

    if (rules?.required && !value.trim()) {
      errors[field.name] = messages.required
      continue
    }

    if (!value.trim()) {
      continue
    }

    if (rules?.minLength !== undefined && value.length < rules.minLength) {
      errors[field.name] = messages.minLength(rules.minLength)
      continue
    }

    if (rules?.maxLength !== undefined && value.length > rules.maxLength) {
      errors[field.name] = messages.maxLength(rules.maxLength)
      continue
    }

    if (field.type === 'email' && !EMAIL_PATTERN.test(value)) {
      errors[field.name] = messages.email
      continue
    }

    if (rules?.pattern && !rules.pattern.test(value)) {
      errors[field.name] = messages.pattern(rules.patternMessageKey)
    }
  }

  return errors
}
