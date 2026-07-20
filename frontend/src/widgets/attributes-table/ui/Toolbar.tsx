import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Tooltip from '@mui/material/Tooltip'
import { AbzaFilterButton } from '@features/abza-filter'
import { AsyncEntityTags } from '@shared/ui/inputs'
import { useAttributesTable } from '../model'
import { AttributesFilterModal } from './FilterModal'

export function AttributesTableToolbar() {
  const { t } = useTranslation()
  const {
    searchTags,
    setSearchTags,
    isLoading,
    canManageAttributes,
    canLinkToProfile,
    canLinkToCandidateProfile,
    selectedIds,
    unlinkableSelectedCount,
    isFilterActive,
    setIsFilterModalOpen,
    handleCreateClick,
    handleDeleteSelected,
    handleLinkSelected,
    handleUnlinkSelected,
    handleOpenLinkToProfileModal,
    handleOpenUnlinkFromProfileModal,
    loadAttributeOptions,
  } = useAttributesTable()

  const canUseProfileActions = canLinkToProfile || canLinkToCandidateProfile
  const linkDisabled = selectedIds.length === 0 || isLoading
  const unlinkDisabled = canLinkToCandidateProfile
    ? selectedIds.length === 0 || isLoading
    : unlinkableSelectedCount === 0 || isLoading

  return (
    <>
      <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
        <Grid size={{ xs: 12, sm: 'grow' }} sx={{ minWidth: 0 }}>
          <AsyncEntityTags
            label={t('attributes.search')}
            value={searchTags}
            onChange={setSearchTags}
            loadOptions={loadAttributeOptions}
            allowCreate
            size="small"
            sx={{ width: '100%', minWidth: 0 }}
            createOptionLabel={(name) => t('attributes.searchAdd', { name })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 'auto' }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <AbzaFilterButton
            active={isFilterActive}
            onClick={() => setIsFilterModalOpen(true)}
            disabled={isLoading}
            aria-label={t('attributes.actions.filter')}
          />
          {canManageAttributes && (
            <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none', minWidth: 40 }}>
              <AddIcon />
            </Button>
          )}
          {canManageAttributes && (
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || isLoading}
              sx={{ boxShadow: 'none', minWidth: 40 }}
            >
              <BackspaceIcon />
            </Button>
          )}
          {canUseProfileActions && (
            <Tooltip title={t('attributes.actions.linkSelected')}>
              <span>
                <Button
                  variant="contained"
                  onClick={canLinkToCandidateProfile ? handleOpenLinkToProfileModal : () => void handleLinkSelected()}
                  disabled={linkDisabled}
                  aria-label={t('attributes.actions.linkSelected')}
                  sx={{ boxShadow: 'none', minWidth: 40 }}
                >
                  <PlaylistAddIcon />
                </Button>
              </span>
            </Tooltip>
          )}
          {canUseProfileActions && (
            <Tooltip title={t('attributes.actions.unlinkSelected')}>
              <span>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={
                    canLinkToCandidateProfile
                      ? handleOpenUnlinkFromProfileModal
                      : () => void handleUnlinkSelected()
                  }
                  disabled={unlinkDisabled}
                  aria-label={t('attributes.actions.unlinkSelected')}
                  sx={{ minWidth: 40 }}
                >
                  <PlaylistRemoveIcon />
                </Button>
              </span>
            </Tooltip>
          )}
        </Grid>
      </Grid>
      <AttributesFilterModal />
    </>
  )
}
