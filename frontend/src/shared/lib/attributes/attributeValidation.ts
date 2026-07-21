export const ATTRIBUTE_VALIDATION_TYPES = [
  'maxLength',
  'minLength',
  'maxNumber',
  'minNumber',
  'regex',
  'maxFileSizeKb',
] as const

export type AttributeValidationType = (typeof ATTRIBUTE_VALIDATION_TYPES)[number]

export type AttributeValidationDto = {
  id: number
  validationType: AttributeValidationType | string
  validationValue: string
}

export type AttributeValidationRequest = {
  validationType: string
  validationValue: string
}

const STRING_VALUE_TYPES = new Set(['string', 'text', 'select'])
const FILE_VALUE_TYPES = new Set(['image', 'file'])

export function getAllowedValidationTypes(valueType: string): AttributeValidationType[] {
  const normalized = valueType.toLowerCase()

  if (STRING_VALUE_TYPES.has(normalized)) {
    return ['maxLength', 'minLength', 'regex']
  }

  if (normalized === 'number') {
    return ['maxNumber', 'minNumber']
  }

  if (FILE_VALUE_TYPES.has(normalized)) {
    return ['maxFileSizeKb']
  }

  return []
}

export function hasAvailableValidations(valueType: string): boolean {
  return getAllowedValidationTypes(valueType).length > 0
}

export function filterValidationsForValueType(
  validations: AttributeValidationRequest[],
  valueType: string,
): AttributeValidationRequest[] {
  const allowed = new Set(getAllowedValidationTypes(valueType))
  return validations.filter((item) => allowed.has(item.validationType as AttributeValidationType))
}

export function getValidationValueInputType(validationType: string): 'number' | 'text' {
  return validationType === 'maxLength' ||
    validationType === 'minLength' ||
    validationType === 'maxNumber' ||
    validationType === 'minNumber' ||
    validationType === 'maxFileSizeKb'
    ? 'number'
    : 'text'
}

export function getMaxFileSizeKbFromValidations(
  validations: Array<{ validationType: string; validationValue: string }> | undefined,
): number | undefined {
  const rule = validations?.find((item) => item.validationType === 'maxFileSizeKb')
  if (!rule) {
    return undefined
  }

  const parsed = Number(rule.validationValue)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}
