import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import BackspaceIcon from '@mui/icons-material/Backspace'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { useUsersTable } from '../model'

export function UsersTableToolbar() {
  const { t } = useTranslation()
  const {
    searchInput,
    setSearchInput,
    handleFilter,
    isLoading,
    selectedIds,
    canManageUsers,
    handleCreateClick,
    handleDeleteSelected,
    handleBulkChangeRoleClick,
    handleManageClick,
  } = useUsersTable()

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
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
        sx={{ minWidth: 260, flexGrow: 1 }}
      />
      <Button variant="outlined" onClick={handleFilter} disabled={isLoading}>
        <SearchIcon />
      </Button>
      {canManageUsers ? (
        <>
          <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
            <AddIcon />
          </Button>
          <Button
            variant="contained"
            onClick={handleManageClick}
            disabled={selectedIds.length !== 1 || isLoading}
            sx={{ boxShadow: 'none' }}
            title={t('profile.users.actions.manageUser')}
          >
            <AdminPanelSettingsIcon />
          </Button>
          <Button
            variant="contained"
            onClick={handleBulkChangeRoleClick}
            disabled={selectedIds.length === 0 || isLoading}
            sx={{ boxShadow: 'none' }}
            title={t('profile.users.actions.changeRoleSelected')}
          >
            <ManageAccountsIcon />
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0 || isLoading}
            sx={{ boxShadow: 'none' }}
          >
            <BackspaceIcon />
          </Button>
        </>
      ) : null}
    </Box>
  )
}
