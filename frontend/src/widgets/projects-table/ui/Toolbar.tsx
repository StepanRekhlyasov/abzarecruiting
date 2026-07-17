import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import SearchIcon from '@mui/icons-material/Search'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import { AbzaFilterButton } from '@features/abza-filter'
import { useProjectsTable } from '../model'
import { ProjectsFilterModal } from './FilterModal'

export function ProjectsTableToolbar() {
  const { t } = useTranslation()
  const {
    searchInput,
    setSearchInput,
    handleFilter,
    isLoading,
    canCreateProjects,
    isFilterActive,
    setIsFilterModalOpen,
    selectedIds,
    handleCreateClick,
    handleDeleteSelected,
  } = useProjectsTable()

  return (
    <>
      <Grid container spacing={2}>
        <Grid sx={{ flex: 1 }}>
          <TextField
            size="small"
            label={t('projects.search')}
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
        <Grid>
          <AbzaFilterButton
            active={isFilterActive}
            onClick={() => setIsFilterModalOpen(true)}
            disabled={isLoading}
            aria-label={t('projects.actions.filter')}
          />
        </Grid>
        {canCreateProjects && (
          <Grid>
            <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
              <AddIcon />
            </Button>
          </Grid>
        )}
        {canCreateProjects && (
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
      <ProjectsFilterModal />
    </>
  )
}
