import type { AbzaFieldConfig, AbzaFormErrors, AbzaFormValues } from '@shared/types'
import { isFileAttributeValue } from '@shared/types'
import {
  getEntityOptionValue,
  getEntityOptionsValue,
  getStringArrayValue,
  getStringValue,
  isFieldVisible,
} from './fieldVisibility'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type AbzaValidationMessages = {
  required: string
  minLength: (min: number) => string
  maxLength: (max: number) => string
  min: (min: number) => string
  max: (max: number) => string
  email: string
  number: string
  pattern: (key?: string) => string
}

export function createAbzaValidationMessages(
  t: (key: string, options?: Record<string, unknown>) => string,
): AbzaValidationMessages {
  return {
    required: t('form.errors.required'),
    minLength: (min: number) => t('form.errors.minLength', { min }),
    maxLength: (max: number) => t('form.errors.maxLength', { max }),
    min: (min: number) => t('form.errors.min', { min }),
    max: (max: number) => t('form.errors.max', { max }),
    email: t('form.errors.email'),
    number: t('form.errors.number'),
    pattern: (key?: string) => (key ? t(key) : t('form.errors.pattern')),
  }
}

export function validateAbzaForm(
  fields: AbzaFieldConfig[],
  values: AbzaFormValues,
  messages: AbzaValidationMessages,
): AbzaFormErrors {
  const errors: AbzaFormErrors = {}

  for (const field of fields) {
    if (!isFieldVisible(field, values)) {
      continue
    }

    const rules = field.validation

    if (field.type === 'optionTags') {
      const options = getStringArrayValue(values, field.name)

      if (rules?.required && options.length === 0) {
        errors[field.name] = messages.required
      }

      continue
    }

    if (field.type === 'asyncEntityTags') {
      const options = getEntityOptionsValue(values, field.name)

      if (rules?.required && options.length === 0) {
        errors[field.name] = messages.required
      }

      continue
    }

    if (field.type === 'asyncEntitySelect') {
      const option = getEntityOptionValue(values, field.name)

      if (rules?.required && !option) {
        errors[field.name] = messages.required
      }

      continue
    }

    if (field.type === 'image' || field.type === 'file') {
      const fileValue = values[field.name]
      if (rules?.required && !isFileAttributeValue(fileValue)) {
        errors[field.name] = messages.required
      }
      continue
    }

    if (field.type === 'checkbox') {
      continue
    }

    const value = getStringValue(values, field.name)

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

    if (field.type === 'number') {
      const numericValue = Number(value)

      if (Number.isNaN(numericValue)) {
        errors[field.name] = messages.number
        continue
      }

      if (rules?.min !== undefined && numericValue < rules.min) {
        errors[field.name] = messages.min(rules.min)
        continue
      }

      if (rules?.max !== undefined && numericValue > rules.max) {
        errors[field.name] = messages.max(rules.max)
        continue
      }
    }

    if (rules?.pattern && !rules.pattern.test(value)) {
      errors[field.name] = messages.pattern(rules.patternMessageKey)
    }
  }

  return errors
}
