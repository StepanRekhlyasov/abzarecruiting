import type { AbzaFormValues } from '@shared/types'
import type { AttributeDto, AttributeValidationRequest } from '@entities/attribute'

export function attributeToFormValues(attribute: AttributeDto): AbzaFormValues {
  return {
    name: attribute.name,
    description: attribute.description ?? '',
    category: attribute.category,
    valueType: attribute.valueType,
    options: attribute.options ?? [],
  }
}

export function attributeToValidations(attribute: AttributeDto): AttributeValidationRequest[] {
  return (attribute.validations ?? []).map((item) => ({
    validationType: item.validationType,
    validationValue: item.validationValue,
  }))
}
