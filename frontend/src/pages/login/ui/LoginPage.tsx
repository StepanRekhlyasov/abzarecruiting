import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { authSucceeded, login } from '@entities/user'
import { createLoginFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { ROUTES } from '@shared/config/routes'
import { toSubmitValues } from '@shared/lib/helpers'
import { AppHeader } from '@features/app-header'
import { AbzaForm, type AbzaFormValues } from '@features/abza-form'
import { SocialLoginButtons } from '@features/social-login'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const externalError = searchParams.get('error')

  const formConfig = useMemo(() => createLoginFormConfig(t), [i18n.language])

  const handleSubmit = async (values: AbzaFormValues) => {
    setIsLoading(true)

    try {
      const response = await login(toSubmitValues(values, ['email', 'password']))

      authSucceeded(response)
      navigate(ROUTES.home)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="sm">
        <Box sx={{ py: 6 }}>
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {t('auth.login.title')}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('auth.login.subtitle')}
            </Typography>

            {externalError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {t(externalError)}
              </Alert>
            ) : null}

            <AbzaForm
              config={formConfig}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />

            <SocialLoginButtons disabled={isLoading} />

            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
              {t('auth.login.noAccount')}{' '}
              <Link component={RouterLink} to={ROUTES.register}>
                {t('auth.login.registerLink')}
              </Link>
            </Typography>
          </Paper>
        </Box>
      </Container>
    </>
  )
}
