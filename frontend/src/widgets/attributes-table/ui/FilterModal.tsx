import { useTranslation } from 'react-i18next'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import { AbzaFilterModal } from '@features/abza-filter'
import { ATTRIBUTE_CATEGORIES, ATTRIBUTE_VALUE_TYPES } from '@shared/types'
import { useAttributesTable } from '../model'

export function AttributesFilterModal() {
  const { t } = useTranslation()
  const {
    isFilterModalOpen,
    setIsFilterModalOpen,
    appliedFilters,
    handleApplyFilters,
    handleResetFilters,
    isLoading,
  } = useAttributesTable()

  return (
    <AbzaFilterModal
      open={isFilterModalOpen}
      onOpenChange={setIsFilterModalOpen}
      value={appliedFilters}
      onApply={handleApplyFilters}
      onReset={handleResetFilters}
      title={t('attributes.filter.title')}
      isLoading={isLoading}
    >
      {(draft, setDraft) => (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="attribute-filter-category-label">
              {t('attributes.fields.category')}
            </InputLabel>
            <Select
              labelId="attribute-filter-category-label"
              label={t('attributes.fields.category')}
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value }))
              }
            >
              <MenuItem value="">
                <em>{t('common.filter.any')}</em>
              </MenuItem>
              {ATTRIBUTE_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {t(`attributes.categories.${category}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="attribute-filter-value-type-label">
              {t('attributes.fields.valueType')}
            </InputLabel>
            <Select
              labelId="attribute-filter-value-type-label"
              label={t('attributes.fields.valueType')}
              value={draft.valueType}
              onChange={(event) =>
                setDraft((current) => ({ ...current, valueType: event.target.value }))
              }
            >
              <MenuItem value="">
                <em>{t('common.filter.any')}</em>
              </MenuItem>
              {ATTRIBUTE_VALUE_TYPES.map((valueType) => (
                <MenuItem key={valueType} value={valueType}>
                  {t(`attributes.valueTypes.${valueType}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}
    </AbzaFilterModal>
  )
}
