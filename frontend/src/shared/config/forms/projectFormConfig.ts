import type { TFunction } from 'i18next'
import type { AbzaFormConfig, AbzaSelectOption } from '@shared/types'

type CreateProjectFormConfigOptions = {
  loadTagOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  loadCandidateOptions?: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  showCandidateSelect?: boolean
}

export function createProjectFormConfig(
  t: TFunction,
  options: CreateProjectFormConfigOptions,
): AbzaFormConfig {
  const fields: AbzaFormConfig['fields'] = []

  if (options.showCandidateSelect && options.loadCandidateOptions) {
    fields.push({
      name: 'candidateId',
      label: t('projects.fields.candidate'),
      type: 'asyncEntitySelect',
      validation: { required: true },
      loadOptions: options.loadCandidateOptions,
    })
  }

  fields.push(
    {
      name: 'name',
      label: t('projects.fields.name'),
      type: 'text',
      validation: { required: true, maxLength: 256 },
    },
    {
      name: 'description',
      label: t('projects.fields.description'),
      type: 'text',
      validation: { maxLength: 1024 },
    },
    {
      name: 'startAt',
      label: t('projects.fields.startAt'),
      type: 'date',
      validation: { required: true },
    },
    {
      name: 'endAt',
      label: t('projects.fields.endAt'),
      type: 'date',
    },
    {
      name: 'tags',
      label: t('projects.fields.tags'),
      type: 'asyncEntityTags',
      allowCreateOptions: true,
      loadOptions: options.loadTagOptions,
    },
  )

  return {
    submitLabel: t('projects.form.submit'),
    fields,
  }
}
