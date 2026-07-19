import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DescriptionIcon from '@mui/icons-material/Description'
import SearchIcon from '@mui/icons-material/Search'
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
    <Grid container spacing={2}>
      <Grid sx={{ flex: 1 }}>
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
          sx={{ minWidth: 260, width: '100%' }}
        />
      </Grid>
      <Grid>
        <Button variant="outlined" onClick={applyFilter} disabled={isLoading}>
          <SearchIcon />
        </Button>
      </Grid>
      {canManagePositions && (
        <Grid>
          <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
            <AddIcon />
          </Button>
        </Grid>
      )}
      {canManagePositions && (
        <Grid>
          <Button
            variant="contained"
            onClick={handleDuplicateSelected}
            disabled={selectedIds.length === 0 || isLoading}
            sx={{ boxShadow: 'none' }}
            aria-label={t('positions.toolbar.duplicate')}
          >
            <ContentCopyIcon />
          </Button>
        </Grid>
      )}
      {canManagePositions && (
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
      {canCreateResumes && (
        <Grid>
          <Button
            variant="contained"
            onClick={handleCreateResumesSelected}
            disabled={selectedIds.length === 0 || isLoading}
            sx={{ boxShadow: 'none' }}
            startIcon={<DescriptionIcon />}
          >
            {t('positions.toolbar.createResume')}
          </Button>
        </Grid>
      )}
    </Grid>
  )
}
