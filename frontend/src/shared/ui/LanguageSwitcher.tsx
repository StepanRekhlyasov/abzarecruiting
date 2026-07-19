import { useTranslation } from 'react-i18next'
import type { SxProps, Theme } from '@mui/material/styles'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
] as const

const languageSwitcherSx = {
  minWidth: 140,
  color: '#fff',
  '& .MuiInputLabel-root': {
    color: '#fff',
    opacity: 0.85,
    '&.Mui-focused': { color: '#fff' },
    '&.MuiInputLabel-shrink': { color: '#fff' },
  },
  '& .MuiOutlinedInput-root': {
    color: '#fff',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.5)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.8)',
  },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.9)',
  },
  '& .MuiSelect-select': { color: '#fff' },
  '& .MuiSvgIcon-root': { color: '#fff' },
} as const

type LanguageSwitcherProps = {
  sx?: SxProps<Theme>
}

export function LanguageSwitcher({ sx }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()

  return (
    <FormControl size="small" sx={{ ...languageSwitcherSx, ...sx }}>
      <InputLabel id="language-select-label">{t('common.language')}</InputLabel>
      <Select
        labelId="language-select-label"
        value={i18n.language.split('-')[0]}
        label={t('common.language')}
        onChange={(event) => {
          void i18n.changeLanguage(event.target.value)
        }}
      >
        {LANGUAGES.map(({ code, label }) => (
          <MenuItem key={code} value={code}>
            {label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
