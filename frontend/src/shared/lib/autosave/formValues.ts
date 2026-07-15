import type { AbzaFormValue, AbzaFormValues } from '@shared/types'

function normalizeFormValue(value: AbzaFormValue) {
  if (Array.isArray(value)) {
    if (
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      'value' in value[0]
    ) {
      return [...value]
        .map((item) => {
          const option = item as { value: string; label: string }
          return { value: option.value, label: option.label }
        })
        .sort((a, b) => a.value.localeCompare(b.value))
    }

    return [...value].map(String).sort()
  }

  if (value && typeof value === 'object' && 'value' in value && 'label' in value) {
    return { value: value.value, label: value.label }
  }

  return value ?? ''
}

export function areAbzaFormValuesEqual(a: AbzaFormValues, b: AbzaFormValues) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const normalize = (values: AbzaFormValues) =>
    Object.fromEntries(
      [...keys].sort().map((key) => [key, normalizeFormValue(values[key] ?? '')]),
    )

  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
}
