import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import FilterListIcon from '@mui/icons-material/FilterList'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import SearchIcon from '@mui/icons-material/Search'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import { useUsersTable } from '../model'
import { UsersFilterModal } from './FilterModal'

export function UsersTableToolbar() {
  const { t } = useTranslation()
  const {
    searchInput,
    setSearchInput,
    handleFilter,
    isLoading,
    selectedIds,
    canManageUsers,
    isFilterActive,
    setIsFilterModalOpen,
    handleCreateClick,
    handleDeleteSelected,
    handleBulkChangeRoleClick,
  } = useUsersTable()

  return (
    <>
      <Grid container spacing={2}>
        <Grid sx={{ flex: 1 }}>
          <TextField
            size="small"
            label={t('profile.users.search')}
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
        {canManageUsers && (
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
              aria-label={t('profile.users.actions.filter')}
            >
              <FilterListIcon />
            </Button>
          </Grid>
        )}
        {canManageUsers && (
          <Grid>
            <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
              <AddIcon />
            </Button>
          </Grid>
        )}
        {canManageUsers && (
          <Grid>
            <Button
              variant="contained"
              onClick={handleBulkChangeRoleClick}
              disabled={selectedIds.length === 0 || isLoading}
              sx={{ boxShadow: 'none' }}
              title={t('profile.users.actions.changeRoleSelected')}
            >
              <ManageAccountsIcon />
            </Button>
          </Grid>
        )}
        {canManageUsers && (
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
      {canManageUsers ? <UsersFilterModal /> : null}
    </>
  )
}
