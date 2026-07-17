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
  const {
    searchInput,
    setSearchInput,
    handleFilter,
    isLoading,
    canCreateResumes,
    canDeleteResumes,
    selectedIds,
    handleCreateClick,
    handleDeleteSelected,
  } = useCvsTable()

  return (
    <Grid container spacing={2}>
      <Grid sx={{ flex: 1 }}>
        <TextField
          size="small"
          label={t('cvs.search')}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleFilter()
            }
          }}
          sx={{ minWidth: 260, width: '100%' }}
        />
      </Grid>
      <Grid>
        <Button variant="outlined" onClick={handleFilter} disabled={isLoading}>
          <SearchIcon />
        </Button>
      </Grid>
      {canCreateResumes && (
        <Grid>
          <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
            <AddIcon />
          </Button>
        </Grid>
      )}
      {canDeleteResumes && (
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
    </Grid>
  )
}
