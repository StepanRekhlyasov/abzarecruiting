import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useUnit } from 'effector-react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { $session, logout } from '@entities/user'
import { getSessionDisplayName } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { LanguageSwitcher } from '@shared/ui'
import { AppSidebar, MenuIcon } from '@features/app-sidebar'

export function AppHeader() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [session, onLogout] = useUnit([$session, logout])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = () => {
    onLogout()
    navigate(ROUTES.home)
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
            <IconButton
              color="inherit"
              aria-label={t('common.menu')}
              onClick={() => setIsSidebarOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {session ? (
              <>
                <Typography variant="body1" sx={{ mr: 1 }}>
                  {t('common.greeting', { name: getSessionDisplayName(session) })}
                </Typography>
                <Button color="inherit" variant="outlined" onClick={handleLogout} sx={{ borderColor: 'rgba(255,255,255,0.5)' }}>
                  {t('common.logout')}
                </Button>
              </>
            ) : (
              <>
                <Button color="inherit" component={RouterLink} to={ROUTES.login}>
                  {t('common.login')}
                </Button>
                <Button color="inherit" variant="outlined" component={RouterLink} to={ROUTES.register} sx={{ borderColor: 'rgba(255,255,255,0.5)' }}>
                  {t('common.register')}
                </Button>
              </>
            )}
            <LanguageSwitcher />
          </Box>
        </Toolbar>
      </AppBar>

      <AppSidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  )
}
