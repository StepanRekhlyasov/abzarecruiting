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
import { i18n } from '@shared/config/i18n'
import { ROUTES } from '@shared/config/routes'
import { toSubmitValues } from '@shared/lib/helpers'
import { AppHeader } from '@features/app-header'
import { AbzaForm, type AbzaFormValues } from '@features/abza-form'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const formConfig = useMemo(() => createRegisterFormConfig(t), [i18n.language])

  const handleSubmit = async (values: AbzaFormValues) => {
    setIsLoading(true)

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
      })

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
              {t('auth.register.title')}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('auth.register.subtitle')}
            </Typography>

            <AbzaForm
              config={formConfig}
              onSubmit={handleSubmit}
              isLoading={isLoading}
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
