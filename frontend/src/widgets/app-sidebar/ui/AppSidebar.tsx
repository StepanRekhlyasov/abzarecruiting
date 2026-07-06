import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { ROUTES } from '@shared/config/routes'

type AppSidebarProps = {
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { to: ROUTES.attributes, labelKey: 'common.attributes' as const },
]

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 280 }} role="navigation">
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="h6">{t('common.appName')}</Typography>
        </Box>
        <Divider />
        <List>
          {NAV_ITEMS.map((item) => (
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
