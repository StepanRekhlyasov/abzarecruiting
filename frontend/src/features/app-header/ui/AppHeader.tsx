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
import { LanguageSwitcher, ThemeSwitcher } from '@shared/ui'
import { AppSidebar, MenuIcon } from '@features/app-sidebar'
import type { SxProps, Theme } from '@mui/material/styles'
import LogoutIcon from '@mui/icons-material/Logout'
import LoginIcon from '@mui/icons-material/Login'
import PersonAddIcon from '@mui/icons-material/PersonAdd'

export function AppHeader({ sx }: { sx?: SxProps<Theme> }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [session, onLogout] = useUnit([$session, logout])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = () => {
    onLogout()
    navigate(ROUTES.home)
  }

  return (
    <Box sx={sx}>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between', gap: { xs: 1, sm: 2 }, minHeight: { xs: 56 }, px: { xs: 1, sm: 2 } }}>
            <IconButton
              color="inherit"
              aria-label={t('common.menu')}
              onClick={() => setIsSidebarOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, minWidth: 0 }}>
            {session ? (
              <>
                <Typography
                  variant="body1"
                  noWrap
                  sx={{ mr: 1, display: { xs: 'none', md: 'block' } }}
                >
                  {t('common.greeting', { name: getSessionDisplayName(session) })}
                </Typography>
                <Button color="inherit" variant="outlined" onClick={handleLogout} sx={{height: '40px', borderColor: 'rgba(255,255,255,0.5)' }}>
                  <LogoutIcon />
                </Button>
              </>
            ) : (
              <>
                <Button sx={{height: '40px'}} color="inherit" variant="outlined" component={RouterLink} to={ROUTES.login}>
                  <LoginIcon />
                </Button>
                <Button color="inherit" variant="outlined" component={RouterLink} to={ROUTES.register} sx={{height: '40px', borderColor: 'rgba(255,255,255,0.5)' }}>
                  <PersonAddIcon />
                </Button>
              </>
            )}
            <LanguageSwitcher sx={{ minWidth: { xs: 110, sm: 140 } }} />
            <ThemeSwitcher />
          </Box>
        </Toolbar>
      </AppBar>

      <AppSidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </Box>
  )
}
