import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { useTagsTable } from '../model'

export function TagsTableToolbar() {
  const { t } = useTranslation()
  const {
    searchInput,
    setSearchInput,
    handleFilter,
    isLoading,
    canCreateTags,
    canManageTags,
    selectedIds,
    handleCreateClick,
    handleDeleteSelected,
  } = useTagsTable()

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
      <TextField
        size="small"
        label={t('tags.search')}
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
      {canCreateTags && (
        <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
          <AddIcon />
        </Button>
      )}
      {canManageTags && (
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
    </Box>
  )
}
