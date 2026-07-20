import { useTranslation } from 'react-i18next'
import Stack from '@mui/material/Stack'
import { AbzaFilterModal } from '@features/abza-filter'
import { TagsField } from '@entities/tag'
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
    <AbzaFilterModal
      open={isFilterModalOpen}
      onOpenChange={setIsFilterModalOpen}
      value={appliedFilters}
      onApply={handleApplyFilters}
      onReset={handleResetFilters}
      title={t('cvs.filter.title')}
      isLoading={isLoading}
    >
      {(draft, setDraft) => (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TagsField
            label={t('cvs.filter.tags')}
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
