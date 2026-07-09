import { useTranslation } from 'react-i18next'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { useCandidatesTable } from '../model'

export function CandidatesTableToolbar() {
  const { t } = useTranslation()
  const { searchInput, setSearchInput, handleFilter, isLoading } = useCandidatesTable()

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
      <TextField
        size="small"
        label={t('profile.candidates.search')}
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
    </Box>
  )
}
