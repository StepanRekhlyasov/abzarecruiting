import type { TFunction } from 'i18next'
import type { AbzaFormConfig } from '@widgets/abza-form'

export function createLoginFormConfig(t: TFunction): AbzaFormConfig {
  return {
    submitLabel: t('auth.login.submit'),
    fields: [
      {
        name: 'email',
        label: t('auth.fields.email'),
        type: 'email',
        autoComplete: 'email',
        validation: { required: true },
      },
      {
        name: 'password',
        label: t('auth.fields.password'),
        type: 'password',
        autoComplete: 'current-password',
        validation: { required: true },
      },
    ],
  }
}

export function createRegisterFormConfig(t: TFunction): AbzaFormConfig {
  return {
    submitLabel: t('auth.register.submit'),
    fields: [
      {
        name: 'firstName',
        label: t('auth.fields.firstName'),
        type: 'text',
        autoComplete: 'given-name',
        validation: { required: true },
      },
      {
        name: 'lastName',
        label: t('auth.fields.lastName'),
        type: 'text',
        autoComplete: 'family-name',
        validation: { required: true },
      },
      {
        name: 'email',
        label: t('auth.fields.email'),
        type: 'email',
        autoComplete: 'email',
        validation: { required: true },
      },
      {
        name: 'password',
        label: t('auth.fields.password'),
        type: 'password',
        autoComplete: 'new-password',
        validation: { required: true },
      },
      {
        name: 'role',
        label: t('auth.fields.role'),
        type: 'select',
        validation: { required: true },
        options: [
          { value: 'Candidate', label: t('auth.roles.candidate') },
          { value: 'Recruiter', label: t('auth.roles.recruiter') },
        ],
      },
    ],
  }
}
