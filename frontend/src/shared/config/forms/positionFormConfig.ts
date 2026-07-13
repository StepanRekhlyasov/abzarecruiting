import type { TFunction } from 'i18next'
import { POSITION_LEVELS, WORK_FORMATS } from '@shared/types'
import type { AbzaFormConfig } from '@shared/types'

type CreatePositionInfoFormConfigOptions = {
  readOnly?: boolean
}

export function createPositionInfoFormConfig(
  t: TFunction,
  options: CreatePositionInfoFormConfigOptions = {},
): AbzaFormConfig {
  const { readOnly = false } = options

  return {
    submitLabel: t('positions.form.submit'),
    fields: [
      {
        name: 'name',
        label: t('positions.fields.name'),
        type: 'text',
        disabled: readOnly,
        validation: readOnly ? undefined : { required: true, maxLength: 256 },
      },
      {
        name: 'description',
        label: t('positions.fields.description'),
        type: 'text',
        disabled: readOnly,
        validation: readOnly ? undefined : { maxLength: 1024 },
      },
      {
        name: 'company',
        label: t('positions.fields.company'),
        type: 'text',
        disabled: readOnly,
        validation: readOnly ? undefined : { maxLength: 256 },
      },
      {
        name: 'country',
        label: t('positions.fields.country'),
        type: 'text',
        disabled: readOnly,
        validation: readOnly ? undefined : { maxLength: 256 },
      },
      {
        name: 'level',
        label: t('positions.fields.level'),
        type: 'select',
        disabled: readOnly,
        options: POSITION_LEVELS.map((value) => ({
          value,
          label: t(`positions.levels.${value}`),
        })),
      },
      {
        name: 'format',
        label: t('positions.fields.format'),
        type: 'select',
        disabled: readOnly,
        options: WORK_FORMATS.map((value) => ({
          value,
          label: t(`positions.formats.${value}`),
        })),
      },
      {
        name: 'maxProjects',
        label: t('positions.fields.maxProjects'),
        type: 'number',
        disabled: readOnly,
        validation: readOnly ? undefined : { min: 0 },
      },
    ],
  }
}
