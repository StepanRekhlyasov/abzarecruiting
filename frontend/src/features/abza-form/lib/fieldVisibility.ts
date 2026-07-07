import type { AbzaFieldConfig, AbzaFormValues } from '@shared/types'

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
  return Array.isArray(value) ? value : []
}
