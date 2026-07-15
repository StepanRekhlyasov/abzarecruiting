import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import { AbzaModal } from '@features/abza-modal'
import { useUsersTable, type UserTableFilters } from '../model'

const ROLE_OPTIONS = ['Candidate', 'Recruiter', 'Admin'] as const
const BOOL_OPTIONS = [
  { value: 'true', labelKey: 'common.yes' },
  { value: 'false', labelKey: 'common.no' },
] as const

export function UsersFilterModal() {
  const { t } = useTranslation()
  const {
    isFilterModalOpen,
    setIsFilterModalOpen,
    appliedFilters,
    handleApplyFilters,
    handleResetFilters,
    isLoading,
  } = useUsersTable()

  const [draft, setDraft] = useState<UserTableFilters>(appliedFilters)

  useEffect(() => {
    if (isFilterModalOpen) {
      setDraft(appliedFilters)
    }
  }, [appliedFilters, isFilterModalOpen])

  return (
    <AbzaModal
      open={isFilterModalOpen}
      config={{
        title: t('profile.users.filter.title'),
        submitLabel: t('profile.users.filter.apply'),
        cancelLabel: t('profile.users.filter.cancel'),
      }}
      secondaryLabel={t('profile.users.filter.reset')}
      onSecondary={handleResetFilters}
      onOpenChange={setIsFilterModalOpen}
      onSubmit={() => handleApplyFilters(draft)}
      isLoading={isLoading}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="user-filter-role-label">{t('profile.users.columns.role')}</InputLabel>
          <Select
            labelId="user-filter-role-label"
            label={t('profile.users.columns.role')}
            value={draft.role}
            onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
          >
            <MenuItem value="">
              <em>{t('profile.users.filter.any')}</em>
            </MenuItem>
            {ROLE_OPTIONS.map((role) => (
              <MenuItem key={role} value={role}>
                {t(`auth.roles.${role.toLowerCase()}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="user-filter-locked-label">
            {t('profile.users.columns.isLockedOut')}
          </InputLabel>
          <Select
            labelId="user-filter-locked-label"
            label={t('profile.users.columns.isLockedOut')}
            value={draft.isLockedOut}
            onChange={(event) =>
              setDraft((current) => ({ ...current, isLockedOut: event.target.value }))
            }
          >
            <MenuItem value="">
              <em>{t('profile.users.filter.any')}</em>
            </MenuItem>
            {BOOL_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="user-filter-activated-label">
            {t('profile.users.columns.emailConfirmed')}
          </InputLabel>
          <Select
            labelId="user-filter-activated-label"
            label={t('profile.users.columns.emailConfirmed')}
            value={draft.emailConfirmed}
            onChange={(event) =>
              setDraft((current) => ({ ...current, emailConfirmed: event.target.value }))
            }
          >
            <MenuItem value="">
              <em>{t('profile.users.filter.any')}</em>
            </MenuItem>
            {BOOL_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </AbzaModal>
  )
}
