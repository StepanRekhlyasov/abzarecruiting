import type { AbzaFieldConfig, AbzaFormValues, AbzaSelectOption } from '@shared/types'

export function isFieldVisible(field: AbzaFieldConfig, values: AbzaFormValues): boolean {
  if (!field.showWhen) {
    return true
  }

  const current = values[field.showWhen.field]
  const currentValue = typeof current === 'string' ? current : ''

  return currentValue === field.showWhen.value
}

export function getStringValue(values: AbzaFormValues, name: string): string {
  const value = values[name]
  return typeof value === 'string' ? value : ''
}

export function getStringArrayValue(values: AbzaFormValues, name: string): string[] {
  const value = values[name]
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

export function getEntityOptionsValue(values: AbzaFormValues, name: string): AbzaSelectOption[] {
  const value = values[name]
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (item): item is AbzaSelectOption =>
      typeof item === 'object' && item !== null && 'value' in item && 'label' in item,
  )
}

export function getEntityOptionValue(values: AbzaFormValues, name: string): AbzaSelectOption | null {
  const value = values[name]
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'value' in value && 'label' in value) {
    return value
  }

  return null
}
