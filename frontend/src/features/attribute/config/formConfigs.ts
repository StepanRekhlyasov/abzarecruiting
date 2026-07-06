import type { TFunction } from 'i18next'
import { ATTRIBUTE_VALUE_TYPES, getInputTypesForValueType } from '@entities/attribute'
import type { AbzaFormConfig } from '@widgets/abza-form'

export function createAttributeFormConfig(t: TFunction, valueType = ''): AbzaFormConfig {
  const inputTypes = getInputTypesForValueType(valueType)

  return {
    submitLabel: t('attributes.form.submit'),
    fields: [
      {
        name: 'name',
        label: t('attributes.fields.name'),
        type: 'text',
        validation: { required: true, minLength: 2, maxLength: 256 },
      },
      {
        name: 'description',
        label: t('attributes.fields.description'),
        type: 'text',
        validation: { maxLength: 1024 },
      },
      {
        name: 'valueType',
        label: t('attributes.fields.valueType'),
        type: 'select',
        validation: { required: true },
        options: ATTRIBUTE_VALUE_TYPES.map((value) => ({
          value,
          label: t(`attributes.valueTypes.${value}`),
        })),
      },
      {
        name: 'inputType',
        label: t('attributes.fields.inputType'),
        type: 'select',
        validation: { required: true },
        disabled: !valueType,
        options: inputTypes.map((value) => ({
          value,
          label: t(`attributes.inputTypes.${value}`),
        })),
      },
    ],
  }
}
