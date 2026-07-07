import type { AbzaFormValues } from '@features/abza-form'
import type { AttributeDto } from '@entities/attribute'

export function attributeToFormValues(attribute: AttributeDto): AbzaFormValues {
  return {
    name: attribute.name,
    description: attribute.description ?? '',
    valueType: attribute.valueType,
  }
}
