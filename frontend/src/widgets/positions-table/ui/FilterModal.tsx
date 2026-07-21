import { useTranslation } from 'react-i18next'
import { TagsFilterModal } from '@features/abza-filter'
import { usePositionsTable } from '../model'

export function PositionsFilterModal() {
  const { t } = useTranslation()
  const {
    isFilterModalOpen,
    setIsFilterModalOpen,
    appliedFilters,
    handleApplyFilters,
    handleResetFilters,
    isLoading,
  } = usePositionsTable()

  return (
    <TagsFilterModal
      open={isFilterModalOpen}
      onOpenChange={setIsFilterModalOpen}
      value={appliedFilters}
      onApply={handleApplyFilters}
      onReset={handleResetFilters}
      title={t('positions.filter.title')}
      tagsLabel={t('positions.filter.tags')}
      isLoading={isLoading}
    />
  )
}
