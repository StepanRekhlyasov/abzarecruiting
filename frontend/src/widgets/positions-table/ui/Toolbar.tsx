import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DescriptionIcon from '@mui/icons-material/Description'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { usePositionsTable } from '../model'

export function PositionsTableToolbar() {
  const { t } = useTranslation()
  const {
    searchInput,
    setSearchInput,
    handleFilter,
    isLoading,
    canManagePositions,
    canCreateResumes,
    selectedIds,
    handleCreateClick,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleCreateResumesSelected,
  } = usePositionsTable()

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
      <TextField
        size="small"
        label={t('positions.search')}
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
      {canManagePositions && (
        <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
          <AddIcon />
        </Button>
      )}
      {canManagePositions && (
        <Button
          variant="contained"
          onClick={handleDuplicateSelected}
          disabled={selectedIds.length === 0 || isLoading}
          sx={{ boxShadow: 'none' }}
          aria-label={t('positions.toolbar.duplicate')}
        >
          <ContentCopyIcon />
        </Button>
      )}
      {canManagePositions && (
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
      {canCreateResumes && (
        <Button
          variant="contained"
          onClick={handleCreateResumesSelected}
          disabled={selectedIds.length === 0 || isLoading}
          sx={{ boxShadow: 'none' }}
          startIcon={<DescriptionIcon />}
        >
          {t('positions.toolbar.createResume')}
        </Button>
      )}
    </Box>
  )
}
