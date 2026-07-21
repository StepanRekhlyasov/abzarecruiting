import { useTranslation } from 'react-i18next'
import { TagsFilterModal } from '@features/abza-filter'
import { useCvsTable } from '../model'

export function CvsFilterModal() {
  const { t } = useTranslation()
  const {
    isFilterModalOpen,
    setIsFilterModalOpen,
    appliedFilters,
    handleApplyFilters,
    handleResetFilters,
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
    />
  )
}
