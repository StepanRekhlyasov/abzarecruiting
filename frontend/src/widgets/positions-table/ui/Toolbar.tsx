import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DescriptionIcon from '@mui/icons-material/Description'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import { usePositionsTable } from '../model'

export function PositionsTableToolbar() {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const {
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

  const applyFilter = () => {
    handleFilter(searchInput)
  }

  return (
    <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
      <Grid size={{ xs: 12, sm: 'grow' }} sx={{ minWidth: 0 }}>
        <TextField
          size="small"
          label={t('positions.search')}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              applyFilter()
            }
          }}
          sx={{ width: '100%', minWidth: 0 }}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 'auto' }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button variant="outlined" onClick={applyFilter} disabled={isLoading} sx={{ minWidth: 40 }}>
          <SearchIcon />
        </Button>
        {canManagePositions && (
          <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none', minWidth: 40 }}>
            <AddIcon />
          </Button>
        )}
        {canManagePositions && (
          <Button
            variant="contained"
            onClick={handleDuplicateSelected}
            disabled={selectedIds.length === 0 || isLoading}
            sx={{ boxShadow: 'none', minWidth: 40 }}
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
            sx={{ boxShadow: 'none', minWidth: 40 }}
          >
            <BackspaceIcon />
          </Button>
        )}
        {canCreateResumes && (
          <Button
            variant="contained"
            onClick={handleCreateResumesSelected}
            disabled={selectedIds.length === 0 || isLoading}
            sx={{
              boxShadow: 'none',
              minWidth: 40,
              px: { xs: 1, sm: 2 },
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
            }}
            startIcon={<DescriptionIcon />}
            aria-label={t('positions.toolbar.createResume')}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {t('positions.toolbar.createResume')}
            </Box>
          </Button>
        )}
      </Grid>
    </Grid>
  )
}
