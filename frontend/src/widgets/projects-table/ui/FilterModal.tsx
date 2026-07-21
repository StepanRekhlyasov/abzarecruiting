import { useTranslation } from 'react-i18next'
import { TagsFilterModal } from '@features/abza-filter'
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
    <TagsFilterModal
      open={isFilterModalOpen}
      onOpenChange={setIsFilterModalOpen}
      value={appliedFilters}
      onApply={handleApplyFilters}
      onReset={handleResetFilters}
      title={t('projects.filter.title')}
      tagsLabel={t('projects.filter.tags')}
      isLoading={isLoading}
      extraFields={
        showCandidateFilter
          ? (draft, setDraft) => (
              <AsyncEntityTags
                label={t('projects.filter.candidates')}
                value={draft.candidates}
                onChange={(candidates) => setDraft((current) => ({ ...current, candidates }))}
                loadOptions={loadCandidateOptions}
                allowCreate={false}
                size="small"
              />
            )
          : undefined
      }
    />
  )
}
