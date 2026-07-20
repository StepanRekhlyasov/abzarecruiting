import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import { TagsField } from '@entities/tag'
import { useTagsTable } from '../model'

export function TagsTableToolbar() {
  const { t } = useTranslation()
  const {
    searchTags,
    setSearchTags,
    isLoading,
    canCreateTags,
    canManageTags,
    selectedIds,
    handleCreateClick,
    handleDeleteSelected,
  } = useTagsTable()

  return (
    <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
      <Grid size={{ xs: 12, sm: 'grow' }} sx={{ minWidth: 0 }}>
        <TagsField
          label={t('tags.search')}
          value={searchTags}
          onChange={setSearchTags}
          allowCreate
          createOnSelect={false}
          size="small"
          sx={{ width: '100%', minWidth: 0 }}
          createOptionLabel={(name) => t('tags.searchAdd', { name })}
        />
      </Grid>
      {(canCreateTags || canManageTags) && (
        <Grid size={{ xs: 12, sm: 'auto' }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {canCreateTags && (
            <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none', minWidth: 40 }}>
              <AddIcon />
            </Button>
          )}
          {canManageTags && (
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
      )}
    </Grid>
  )
}
