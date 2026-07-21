import { useTranslation } from 'react-i18next'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import { TagsFilterModal } from '@features/abza-filter'
import { AsyncEntityTags } from '@shared/ui/inputs'
import { useCvsTable } from '../model'

const PUBLISHED_OPTIONS = [
  { value: 'true', labelKey: 'common.yes' },
  { value: 'false', labelKey: 'common.no' },
] as const

export function CvsFilterModal() {
  const { t } = useTranslation()
  const {
    isFilterModalOpen,
    setIsFilterModalOpen,
    appliedFilters,
    handleApplyFilters,
    handleResetFilters,
    showCandidateFilter,
    showPublishedFilter,
    loadCandidateOptions,
    isLoading,
  } = useCvsTable()

  return (
    <TagsFilterModal
      open={isFilterModalOpen}
      onOpenChange={setIsFilterModalOpen}
      value={appliedFilters}
      onApply={handleApplyFilters}
      onReset={handleResetFilters}
      title={t('cvs.filter.title')}
      tagsLabel={t('cvs.filter.tags')}
      isLoading={isLoading}
      extraFields={
        showCandidateFilter || showPublishedFilter
          ? (draft, setDraft) => (
              <Stack spacing={2}>
                {showCandidateFilter ? (
                  <AsyncEntityTags
                    label={t('cvs.filter.candidates')}
                    value={draft.candidates}
                    onChange={(candidates) => setDraft((current) => ({ ...current, candidates }))}
                    loadOptions={loadCandidateOptions}
                    allowCreate={false}
                    size="small"
                  />
                ) : null}
                {showPublishedFilter ? (
                  <FormControl fullWidth size="small">
                    <InputLabel id="cvs-filter-published-label">
                      {t('cvs.filter.published')}
                    </InputLabel>
                    <Select
                      labelId="cvs-filter-published-label"
                      label={t('cvs.filter.published')}
                      value={draft.published}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, published: event.target.value }))
                      }
                    >
                      <MenuItem value="">
                        <em>{t('common.filter.any')}</em>
                      </MenuItem>
                      {PUBLISHED_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : null}
              </Stack>
            )
          : undefined
      }
    />
  )
}
