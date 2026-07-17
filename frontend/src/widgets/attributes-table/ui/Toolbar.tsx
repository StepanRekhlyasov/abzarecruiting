import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import FilterListIcon from '@mui/icons-material/FilterList'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Tooltip from '@mui/material/Tooltip'
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
      <Grid container spacing={2}>
        <Grid sx={{ flex: 1 }}>
          <AsyncEntityTags
            label={t('attributes.search')}
            value={searchTags}
            onChange={setSearchTags}
            loadOptions={loadAttributeOptions}
            allowCreate
            size="small"
            sx={{ minWidth: 260, width: '100%' }}
            createOptionLabel={(name) => t('attributes.searchAdd', { name })}
          />
        </Grid>
        <Grid>
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
        </Grid>
        {canManageAttributes && (
          <Grid>
            <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
              <AddIcon />
            </Button>
          </Grid>
        )}
        {canManageAttributes && (
          <Grid>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || isLoading}
              sx={{ boxShadow: 'none' }}
            >
              <BackspaceIcon />
            </Button>
          </Grid>
        )}
        {canUseProfileActions && (
          <Grid>
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
          </Grid>
        )}
        {canUseProfileActions && (
          <Grid>
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
          </Grid>
        )}
      </Grid>
      <AttributesFilterModal />
    </>
  )
}
