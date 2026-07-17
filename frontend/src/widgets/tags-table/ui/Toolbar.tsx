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
    <Grid container spacing={2}>
      <Grid sx={{ flex: 1 }}>
        <TagsField
          label={t('tags.search')}
          value={searchTags}
          onChange={setSearchTags}
          allowCreate
          createOnSelect={false}
          size="small"
          sx={{ minWidth: 260, width: '100%' }}
          createOptionLabel={(name) => t('tags.searchAdd', { name })}
        />
      </Grid>
      {canCreateTags && (
        <Grid>
          <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
            <AddIcon />
          </Button>
        </Grid>
      )}
      {canManageTags && (
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
