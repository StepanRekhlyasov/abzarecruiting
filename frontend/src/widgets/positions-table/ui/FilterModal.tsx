import { useTranslation } from 'react-i18next'
import Stack from '@mui/material/Stack'
import { AbzaFilterModal } from '@features/abza-filter'
import { TagsField } from '@entities/tag'
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
    <AbzaFilterModal
      open={isFilterModalOpen}
      onOpenChange={setIsFilterModalOpen}
      value={appliedFilters}
      onApply={handleApplyFilters}
      onReset={handleResetFilters}
      title={t('positions.filter.title')}
      isLoading={isLoading}
    >
      {(draft, setDraft) => (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TagsField
            label={t('positions.filter.tags')}
            value={draft.tags}
            onChange={(tags) => setDraft((current) => ({ ...current, tags }))}
            allowCreate={false}
            size="small"
          />
        </Stack>
      )}
    </AbzaFilterModal>
  )
}
