import type { TFunction } from 'i18next'
import { POSITION_LEVELS, WORK_FORMATS } from '@shared/types'
import type { AbzaFormConfig, AsyncEntityLoadOptions } from '@shared/types'

type CreatePositionInfoFormConfigOptions = {
  readOnly?: boolean
  loadAttributeOptions?: AsyncEntityLoadOptions
  loadTagOptions?: AsyncEntityLoadOptions
  withRelations?: boolean
}

export function createPositionInfoFormConfig(
  t: TFunction,
  options: CreatePositionInfoFormConfigOptions = {},
): AbzaFormConfig {
  const {
    readOnly = false,
    loadAttributeOptions,
    loadTagOptions,
    withRelations = Boolean(loadAttributeOptions && loadTagOptions),
  } = options

  const fields: AbzaFormConfig['fields'] = [
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
      tooltip: t('positions.fields.maxProjectsHint'),
      validation: readOnly ? undefined : { min: 0 },
    },
  ]

  if (withRelations && loadAttributeOptions && loadTagOptions) {
    fields.push(
      {
        name: 'attributes',
        label: t('positions.fields.attributes'),
        type: 'asyncEntityTags',
        disabled: readOnly,
        loadOptions: loadAttributeOptions,
      },
      {
        name: 'tags',
        label: t('positions.fields.tags'),
        type: 'asyncEntityTags',
        disabled: readOnly,
        loadOptions: loadTagOptions,
        allowCreateOptions: !readOnly,
      },
    )
  }

  return {
    submitLabel: t('positions.form.submit'),
    fields,
  }
}

export function createPositionRelationsFormConfig(
  t: TFunction,
  options: {
    readOnly?: boolean
    loadAttributeOptions: AsyncEntityLoadOptions
    loadTagOptions: AsyncEntityLoadOptions
  },
): AbzaFormConfig {
  const { readOnly = false, loadAttributeOptions, loadTagOptions } = options

  return {
    fields: [
      {
        name: 'attributes',
        label: t('positions.fields.attributes'),
        type: 'asyncEntityTags',
        disabled: readOnly,
        loadOptions: loadAttributeOptions,
      },
      {
        name: 'tags',
        label: t('positions.fields.tags'),
        type: 'asyncEntityTags',
        disabled: readOnly,
        loadOptions: loadTagOptions,
        allowCreateOptions: !readOnly,
      },
    ],
  }
}
