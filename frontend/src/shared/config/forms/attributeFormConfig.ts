import type { TFunction } from 'i18next'
import { ATTRIBUTE_VALUE_TYPES } from '@shared/types'
import type { AbzaFormConfig } from '@shared/types'

export function createAttributeFormConfig(t: TFunction): AbzaFormConfig {
  return {
    submitLabel: t('attributes.form.submit'),
    fields: [
      {
        name: 'name',
        label: t('attributes.fields.name'),
        type: 'text',
        validation: { required: true, maxLength: 256 },
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
        name: 'options',
        label: t('attributes.inputTypes.select'),
        type: 'optionTags',
        showWhen: { field: 'valueType', value: 'select' },
      },
    ],
  }
}
