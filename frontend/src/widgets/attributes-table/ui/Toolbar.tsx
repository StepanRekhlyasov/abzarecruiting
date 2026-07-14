import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import FilterListIcon from '@mui/icons-material/FilterList'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { AsyncEntityTags } from '@shared/ui/inputs'
import { useAttributesTable } from '../model'
import { AttributesFilterModal } from './FilterModal'

const toolbarRootSx = {
  display: 'flex',
  flexWrap: { xs: 'wrap', md: 'nowrap' },
  gap: 2,
  alignItems: 'stretch',
} as const

const searchSx = {
  minWidth: 300,
  flex: '1 1 300px',
  width: { xs: '100%', md: 'auto' },
} as const

const actionsSx = {
  display: 'flex',
  flexWrap: 'nowrap',
  gap: 2,
  flexShrink: 0,
  width: { xs: '100%', md: 'auto' },
  overflowX: 'auto',
} as const

export function AttributesTableToolbar() {
  const { t } = useTranslation()
  const {
    searchTags,
    setSearchTags,
    isLoading,
    canManageAttributes,
    canLinkToProfile,
    selectedIds,
    unlinkableSelectedCount,
    isFilterActive,
    setIsFilterModalOpen,
    handleCreateClick,
    handleDeleteSelected,
    handleLinkSelected,
    handleUnlinkSelected,
    loadAttributeOptions,
  } = useAttributesTable()

  return (
    <Box sx={toolbarRootSx}>
      <AsyncEntityTags
        label={t('attributes.search')}
        value={searchTags}
        onChange={setSearchTags}
        loadOptions={loadAttributeOptions}
        allowCreate
        size="small"
        sx={searchSx}
        createOptionLabel={(name) => t('attributes.searchAdd', { name })}
      />
      <Box sx={actionsSx}>
        <Button
          variant={isFilterActive ? 'contained' : 'outlined'}
          onClick={() => setIsFilterModalOpen(true)}
          disabled={isLoading}
          sx={
            isFilterActive
              ? undefined
              : {
                  color: 'action.active',
                  borderColor: 'divider',
                }
          }
          aria-label={t('attributes.actions.filter')}
        >
          <FilterListIcon />
        </Button>
        {canManageAttributes && (
          <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
            <AddIcon />
          </Button>
        )}
        {canManageAttributes && (
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0 || isLoading}
            sx={{ boxShadow: 'none' }}
          >
            <BackspaceIcon />
          </Button>
        )}
        {canLinkToProfile && (
          <Button
            variant="contained"
            onClick={handleLinkSelected}
            disabled={selectedIds.length === 0 || isLoading}
            sx={{ boxShadow: 'none', whiteSpace: 'nowrap' }}
          >
            {t('attributes.actions.linkSelected')}
          </Button>
        )}
        {canLinkToProfile && (
          <Button
            variant="outlined"
            color="error"
            onClick={handleUnlinkSelected}
            disabled={unlinkableSelectedCount === 0 || isLoading}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {t('attributes.actions.unlinkSelected')}
          </Button>
        )}
      </Box>
      <AttributesFilterModal />
    </Box>
  )
}
