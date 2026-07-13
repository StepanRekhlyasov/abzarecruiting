import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useUnit } from 'effector-react'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { $session, isAdmin, isCandidate } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { useAppSettings } from '@shared/config/app/index'

type AppSidebarProps = {
  open: boolean
  onClose: () => void
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { version } = useAppSettings()
  const session = useUnit($session)

  const navItems = useMemo(() => {
    const items = [
      { to: ROUTES.attributes, labelKey: 'common.attributes' as const },
      { to: ROUTES.positions, labelKey: 'common.positions' as const },
      { to: ROUTES.cvs, labelKey: 'common.cvs' as const },
    ]

    if (!isCandidate(session)) {
      items.splice(1, 0, { to: ROUTES.tags, labelKey: 'common.tags' as const })
    }

    if (isCandidate(session) || isAdmin(session)) {
      items.push({ to: ROUTES.projects, labelKey: 'common.projects' as const })
      items.push({ to: ROUTES.profile, labelKey: 'common.profile' as const })
    }

    return items
  }, [session])

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 280 }} role="navigation">
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="h6">{t('common.appName')} {version}</Typography>
        </Box>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={location.pathname === item.to}
              onClick={onClose}
            >
              <ListItemText primary={t(item.labelKey)} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  )
}
