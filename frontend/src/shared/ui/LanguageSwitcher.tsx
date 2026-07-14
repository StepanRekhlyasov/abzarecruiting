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

type LanguageSwitcherProps = {
  sx?: SxProps<Theme>
}

export function LanguageSwitcher({ sx }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()

  return (
    <FormControl size="small" sx={{ minWidth: 140, ...sx }}>
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
