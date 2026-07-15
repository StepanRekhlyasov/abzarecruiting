import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { getExternalLoginUrl, type ExternalAuthProvider } from '@entities/user'

type SocialLoginButtonsProps = {
  disabled?: boolean
}

export function SocialLoginButtons({ disabled = false }: SocialLoginButtonsProps) {
  const { t } = useTranslation()

  const handleClick = (provider: ExternalAuthProvider) => {
    window.location.assign(getExternalLoginUrl(provider))
  }

  return (
    <Stack spacing={1.5} sx={{ mt: 3 }}>
      <Divider>
        <Typography variant="body2" color="text.secondary">
          {t('auth.social.or')}
        </Typography>
      </Divider>

      <Button
        variant="outlined"
        fullWidth
        disabled={disabled}
        onClick={() => handleClick('google')}
      >
        {t('auth.social.google')}
      </Button>

      <Button
        variant="outlined"
        fullWidth
        disabled={disabled}
        onClick={() => handleClick('facebook')}
      >
        {t('auth.social.facebook')}
      </Button>
    </Stack>
  )
}
