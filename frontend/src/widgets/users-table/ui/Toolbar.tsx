import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import SearchIcon from '@mui/icons-material/Search'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import { AbzaFilterButton } from '@features/abza-filter'
import { useUsersTable } from '../model'

export function UsersTableToolbar() {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const {
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

  const applyFilter = () => {
    handleFilter(searchInput)
  }

  return (
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
      {canManageUsers && (
        <Grid>
          <AbzaFilterButton
            active={isFilterActive}
            onClick={() => setIsFilterModalOpen(true)}
            disabled={isLoading}
            aria-label={t('profile.users.actions.filter')}
          />
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
  )
}
