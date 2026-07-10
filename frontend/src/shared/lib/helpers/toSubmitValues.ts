import type { AbzaFormValues } from '@shared/types'

export function toSubmitString(values: AbzaFormValues, key: string): string {
  const value = values[key]
  return typeof value === 'string' ? value : ''
}

export function toSubmitNullableString(values: AbzaFormValues, key: string): string | null {
  return toSubmitString(values, key) || null
}

export function toSubmitStringArray(values: AbzaFormValues, key: string): string[] {
  const value = values[key]
  return Array.isArray(value) ? value : []
}

export function toSubmitValues<const K extends string>(
  values: AbzaFormValues,
  keys: readonly K[],
): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, toSubmitString(values, key)])) as Record<
    K,
    string
  >
}
