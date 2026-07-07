import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { useAttributesTable } from '../model'

export function AttributesTableToolbar() {
  const { t } = useTranslation()
  const {
    searchInput,
    setSearchInput,
    handleFilter,
    isLoading,
    canManageAttributes,
    canLinkToProfile,
    selectedIds,
    unlinkableSelectedCount,
    hasDefaultInSelection,
    handleCreateClick,
    handleDeleteSelected,
    handleLinkSelected,
    handleUnlinkSelected,
  } = useAttributesTable()

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
      <TextField
        size="small"
        label={t('attributes.search')}
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            handleFilter()
          }
        }}
        sx={{ minWidth: 260, flexGrow: 1 }}
      />
      <Button variant="outlined" onClick={handleFilter} disabled={isLoading}>
        <SearchIcon />
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
          sx={{ boxShadow: 'none' }}
        >
          {t('attributes.actions.linkSelected')}
        </Button>
      )}
      {canLinkToProfile && (
        <Button
          variant="outlined"
          color="error"
          onClick={handleUnlinkSelected}
          disabled={unlinkableSelectedCount === 0 || isLoading || hasDefaultInSelection}
        >
          {t('attributes.actions.unlinkSelected')}
        </Button>
      )}
    </Box>
  )
}
