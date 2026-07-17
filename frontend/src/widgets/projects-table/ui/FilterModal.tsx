import { useTranslation } from 'react-i18next'
import Stack from '@mui/material/Stack'
import { AbzaFilterModal } from '@features/abza-filter'
import { TagsField } from '@entities/tag'
import { AsyncEntityTags } from '@shared/ui/inputs'
import { useProjectsTable } from '../model'

export function ProjectsFilterModal() {
  const { t } = useTranslation()
  const {
    isFilterModalOpen,
    setIsFilterModalOpen,
    appliedFilters,
    handleApplyFilters,
    handleResetFilters,
    showCandidateFilter,
    loadCandidateOptions,
    isLoading,
  } = useProjectsTable()

  return (
    <AbzaFilterModal
      open={isFilterModalOpen}
      onOpenChange={setIsFilterModalOpen}
      value={appliedFilters}
      onApply={handleApplyFilters}
      onReset={handleResetFilters}
      title={t('projects.filter.title')}
      isLoading={isLoading}
    >
      {(draft, setDraft) => (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TagsField
            label={t('projects.filter.tags')}
            value={draft.tags}
            onChange={(tags) => setDraft((current) => ({ ...current, tags }))}
            allowCreate={false}
            size="small"
          />
          {showCandidateFilter ? (
            <AsyncEntityTags
              label={t('projects.filter.candidates')}
              value={draft.candidates}
              onChange={(candidates) => setDraft((current) => ({ ...current, candidates }))}
              loadOptions={loadCandidateOptions}
              allowCreate={false}
              size="small"
            />
          ) : null}
        </Stack>
      )}
    </AbzaFilterModal>
  )
}
