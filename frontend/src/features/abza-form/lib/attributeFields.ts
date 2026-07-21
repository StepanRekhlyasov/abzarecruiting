import type {
  AbzaFieldConfig,
  AbzaFieldType,
  AbzaFormConfig,
  AbzaFormValue,
  AbzaFormValues,
  AttributeDraftValue,
  ProfileAttributeDto,
} from '@shared/types'
import { toAttributeDraftValue } from '@shared/types'
import { getMaxFileSizeKbFromValidations } from '@shared/lib/attributes/attributeValidation'

const INPUT_TYPE_MAP: Record<string, AbzaFieldType> = {
  text: 'text',
  textarea: 'textarea',
  email: 'email',
  number: 'number',
  tel: 'tel',
  date: 'date',
  checkbox: 'checkbox',
  select: 'select',
  period: 'period',
  image: 'image',
  file: 'file',
}

export function mapAttributeInputType(inputType: string): AbzaFieldType {
  return INPUT_TYPE_MAP[inputType.toLowerCase()] ?? 'text'
}

export function attributeToFieldConfig(
  attribute: ProfileAttributeDto,
  options?: {
    disabled?: boolean
    deletable?: boolean
    size?: 'small' | 'medium'
  },
): AbzaFieldConfig {
  return {
    name: String(attribute.id),
    label: attribute.name,
    type: mapAttributeInputType(attribute.inputType),
    options: attribute.options.map((option) => ({ value: option, label: option })),
    tooltip: attribute.description ?? undefined,
    disabled: options?.disabled,
    deletable: options?.deletable,
    size: options?.size ?? 'small',
    maxFileSizeKb: getMaxFileSizeKbFromValidations(attribute.validations),
  }
}

export function attributesToFormConfig(
  attributes: ProfileAttributeDto[],
  options?: {
    disabled?: boolean
    deletable?: boolean
    size?: 'small' | 'medium'
  },
): AbzaFormConfig {
  return {
    fields: attributes.map((attribute) => attributeToFieldConfig(attribute, options)),
  }
}

export function attributesToFormValues(
  attributes: ProfileAttributeDto[],
  draftValues?: Record<number, AttributeDraftValue>,
): AbzaFormValues {
  return Object.fromEntries(
    attributes.map((attribute) => [
      String(attribute.id),
      (draftValues?.[attribute.id] ?? toAttributeDraftValue(attribute)) as AbzaFormValue,
    ]),
  )
}
