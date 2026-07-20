import type { TFunction } from 'i18next'
import type { AbzaFormConfig, AbzaSelectOption } from '@shared/types'

type CreateResumeFormConfigOptions = {
  loadPositionOptions: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  loadCandidateOptions?: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  showCandidateSelect?: boolean
  hidePositionSelect?: boolean
}

export function createResumeFormConfig(
  t: TFunction,
  options: CreateResumeFormConfigOptions,
): AbzaFormConfig {
  const fields: AbzaFormConfig['fields'] = []

  if (options.showCandidateSelect && options.loadCandidateOptions) {
    fields.push({
      name: 'candidateId',
      label: t('cvs.fields.candidate'),
      type: 'asyncEntitySelect',
      validation: { required: true },
      loadOptions: options.loadCandidateOptions,
    })
  }

  if (!options.hidePositionSelect) {
    fields.push({
      name: 'positionId',
      label: t('cvs.fields.position'),
      type: 'asyncEntitySelect',
      validation: { required: true },
      loadOptions: options.loadPositionOptions,
    })
  }

  return {
    submitLabel: t('cvs.create.submit'),
    fields,
  }
}
