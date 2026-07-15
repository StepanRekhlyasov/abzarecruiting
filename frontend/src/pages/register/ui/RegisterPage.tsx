import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { register, type UserRole } from '@entities/user'
import { createRegisterFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { ROUTES } from '@shared/config/routes'
import { toSubmitValues } from '@shared/lib/helpers'
import { AppHeader } from '@features/app-header'
import { AbzaForm, type AbzaFormValues } from '@features/abza-form'
import { SocialLoginButtons } from '@features/social-login'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const formConfig = useMemo(() => createRegisterFormConfig(t), [i18n.language])

  const handleSubmit = async (values: AbzaFormValues) => {
    setIsLoading(true)
    setSuccessMessage(null)

    try {
      const submitted = toSubmitValues(values, [
        'email',
        'password',
        'firstName',
        'lastName',
        'role',
      ])
      const response = await register({
        ...submitted,
        role: submitted.role as UserRole,
        frontendBaseUrl: window.location.origin,
      })

      setSuccessMessage(response.message || 'auth.register.checkEmail')
      window.setTimeout(() => {
        navigate(ROUTES.login)
      }, 2500)
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
              {t('auth.register.title')}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('auth.register.subtitle')}
            </Typography>

            {successMessage ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                {t(successMessage)}
              </Alert>
            ) : null}

            <AbzaForm
              config={formConfig}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />

            <SocialLoginButtons disabled={isLoading || Boolean(successMessage)} />

            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
              {t('auth.register.hasAccount')}{' '}
              <Link component={RouterLink} to={ROUTES.login}>
                {t('auth.register.loginLink')}
              </Link>
            </Typography>
          </Paper>
        </Box>
      </Container>
    </>
  )
}
