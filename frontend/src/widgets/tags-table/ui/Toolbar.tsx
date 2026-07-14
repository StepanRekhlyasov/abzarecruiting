import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { AsyncEntityTags } from '@shared/ui/inputs'
import { useTagsTable } from '../model'

const toolbarRootSx = {
  display: 'flex',
  flexWrap: { xs: 'wrap', md: 'nowrap' },
  gap: 2,
  alignItems: 'stretch',
} as const

const searchSx = {
  minWidth: 300,
  flex: '1 1 300px',
  width: { xs: '100%', md: 'auto' },
} as const

const actionsSx = {
  display: 'flex',
  flexWrap: 'nowrap',
  gap: 2,
  flexShrink: 0,
  width: { xs: '100%', md: 'auto' },
  overflowX: 'auto',
} as const

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
    loadTagOptions,
  } = useTagsTable()

  return (
    <Box sx={toolbarRootSx}>
      <AsyncEntityTags
        label={t('tags.search')}
        value={searchTags}
        onChange={setSearchTags}
        loadOptions={loadTagOptions}
        allowCreate
        size="small"
        sx={searchSx}
        createOptionLabel={(name) => t('tags.searchAdd', { name })}
      />
      <Box sx={actionsSx}>
        {canCreateTags && (
          <Button variant="contained" onClick={handleCreateClick} disabled={isLoading} sx={{ boxShadow: 'none' }}>
            <AddIcon />
          </Button>
        )}
        {canManageTags && (
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0 || isLoading}
            sx={{ boxShadow: 'none' }}
          >
            <BackspaceIcon />
          </Button>
        )}
      </Box>
    </Box>
  )
}
