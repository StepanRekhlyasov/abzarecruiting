import { useTranslation } from 'react-i18next'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { LanguageSwitcher } from '@shared/ui'

export function AppHeader() {
  const { t } = useTranslation()

  return (
    <AppBar position="static">
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div">
          {t('common.appName')}
        </Typography>
        <LanguageSwitcher
          sx={{
            '& .MuiInputLabel-root': { color: 'inherit' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
            '& .MuiSvgIcon-root': { color: 'inherit' },
            color: 'inherit',
          }}
        />
      </Toolbar>
    </AppBar>
  )
}
