import type { TFunction } from 'i18next'
import type { AbzaFormConfig } from '@shared/types'

const roleOptions = (t: TFunction) => [
  { value: 'Candidate', label: t('auth.roles.candidate') },
  { value: 'Recruiter', label: t('auth.roles.recruiter') },
  { value: 'Admin', label: t('auth.roles.admin') },
]

export function createUserFormConfig(t: TFunction): AbzaFormConfig {
  return {
    submitLabel: t('profile.users.create.submit'),
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
        options: roleOptions(t),
      },
    ],
  }
}

export function createChangeRoleFormConfig(t: TFunction): AbzaFormConfig {
  return {
    submitLabel: t('profile.users.changeRole.submit'),
    fields: [
      {
        name: 'role',
        label: t('auth.fields.role'),
        type: 'select',
        validation: { required: true },
        options: roleOptions(t),
      },
    ],
  }
}
