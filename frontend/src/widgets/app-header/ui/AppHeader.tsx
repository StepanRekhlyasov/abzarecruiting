import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { ROUTES } from '@shared/config/routes'
import { LanguageSwitcher } from '@shared/ui'

export function AppHeader() {
  const { t } = useTranslation()

  return (
    <AppBar position="static">
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6" component={RouterLink} to={ROUTES.home} sx={{ color: 'inherit', textDecoration: 'none' }}>
          {t('common.appName')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button color="inherit" component={RouterLink} to={ROUTES.login}>
            {t('common.login')}
          </Button>
          <Button color="inherit" variant="outlined" component={RouterLink} to={ROUTES.register} sx={{ borderColor: 'rgba(255,255,255,0.5)' }}>
            {t('common.register')}
          </Button>
          <LanguageSwitcher
            sx={{
              '& .MuiInputLabel-root': { color: 'inherit' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
              '& .MuiSvgIcon-root': { color: 'inherit' },
              color: 'inherit',
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  )
}
