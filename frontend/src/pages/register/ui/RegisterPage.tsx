import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { authSucceeded, register, type UserRole } from '@entities/user'
import { createRegisterFormConfig } from '@shared/config/forms'
import { ROUTES } from '@shared/config/routes'
import { AppHeader } from '@features/app-header'
import { AbzaForm, type AbzaFormValues } from '@features/abza-form'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const formConfig = useMemo(() => createRegisterFormConfig(t), [t])

  const handleSubmit = async (values: AbzaFormValues) => {
    setIsSubmitting(true)
    setServerError(null)

    try {
      const response = await register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role as UserRole,
      })

      authSucceeded(response)
      navigate(ROUTES.home)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : t('auth.errors.unknown'))
    } finally {
      setIsSubmitting(false)
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

            <AbzaForm
              config={formConfig}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              serverError={serverError}
            />

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
