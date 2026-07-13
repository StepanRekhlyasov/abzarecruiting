import type { TFunction } from 'i18next'
import type { AbzaFormConfig } from '@shared/types'

export function createTagFormConfig(t: TFunction): AbzaFormConfig {
  return {
    submitLabel: t('tags.form.submit'),
    fields: [
      {
        name: 'name',
        label: t('tags.fields.name'),
        type: 'text',
        validation: { required: true, maxLength: 256 },
      },
    ],
  }
}
