import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Switch from '@mui/material/Switch'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { useThemeMode } from '@shared/config/theme'

const LIGHT_GOLD = '#f5c542'
const DARK_MOON = '#90caf9'
const INACTIVE = 'rgba(255, 255, 255, 0.45)'

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { mode, setMode } = useThemeMode()
  const isDark = mode === 'dark'

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      }}
      aria-label={t('common.theme')}
    >
      <LightModeIcon
        fontSize="small"
        sx={{ color: isDark ? INACTIVE : LIGHT_GOLD }}
      />
      <Switch
        checked={isDark}
        onChange={(_, checked) => setMode(checked ? 'dark' : 'light')}
        aria-label={t('common.theme')}
        sx={{
          '& .MuiSwitch-switchBase': {
            color: LIGHT_GOLD,
            '&.Mui-checked': {
              color: DARK_MOON,
              '& + .MuiSwitch-track': {
                backgroundColor: DARK_MOON,
                opacity: 0.55,
              },
            },
          },
          '& .MuiSwitch-track': {
            backgroundColor: LIGHT_GOLD,
            opacity: 0.5,
          },
        }}
      />
      <DarkModeIcon
        fontSize="small"
        sx={{ color: isDark ? DARK_MOON : INACTIVE }}
      />
    </Box>
  )
}
