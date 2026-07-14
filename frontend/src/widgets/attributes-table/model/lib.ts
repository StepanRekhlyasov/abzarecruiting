import type { AbzaFormValues } from '@shared/types'
import type { AttributeDto } from '@entities/attribute'

export function attributeToFormValues(attribute: AttributeDto): AbzaFormValues {
  return {
    name: attribute.name,
    description: attribute.description ?? '',
    category: attribute.category,
    valueType: attribute.valueType,
    options: attribute.options ?? [],
  }
}
