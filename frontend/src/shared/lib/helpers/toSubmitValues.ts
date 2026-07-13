import type { AbzaFormValues, AbzaSelectOption } from '@shared/types'

export function toSubmitString(values: AbzaFormValues, key: string): string {
  const value = values[key]
  return typeof value === 'string' ? value : ''
}

export function toSubmitNullableString(values: AbzaFormValues, key: string): string | null {
  return toSubmitString(values, key) || null
}

export function toSubmitStringArray(values: AbzaFormValues, key: string): string[] {
  const value = values[key]
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

export function toSubmitEntityIds(values: AbzaFormValues, key: string): number[] {
  const value = values[key]
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return Number(item)
      }

      if (typeof item === 'object' && item !== null && 'value' in item) {
        return Number((item as AbzaSelectOption).value)
      }

      return Number.NaN
    })
    .filter((id) => Number.isFinite(id))
}

export function toSubmitNumber(values: AbzaFormValues, key: string): number {
  return Number(toSubmitString(values, key))
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
