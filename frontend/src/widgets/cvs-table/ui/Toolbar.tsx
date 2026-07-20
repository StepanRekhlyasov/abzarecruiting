import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import SearchIcon from '@mui/icons-material/Search'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import { useCvsTable } from '../model'

export function CvsTableToolbar() {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const {
    handleFilter,
    isLoading,
    canCreateResumes,
    canDeleteResumes,
    selectedIds,
    handleCreateClick,
    handleDeleteSelected,
  } = useCvsTable()

  const applyFilter = () => {
    handleFilter(searchInput)
  }

  return (
    <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
      <Grid size={{ xs: 12, sm: 'grow' }} sx={{ minWidth: 0 }}>
        <TextField
          size="small"
          label={t('cvs.search')}
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
        {canCreateResumes && (
          <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none', minWidth: 40 }}>
            <AddIcon />
          </Button>
        )}
        {canDeleteResumes && (
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
      </Grid>
    </Grid>
  )
}
