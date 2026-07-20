import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { confirmEmail } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { parseApiError } from '@shared/lib/errors'
import { PageTemplate } from '@/shared/ui'

export function ConfirmEmailPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const userId = searchParams.get('userId')
    const token = searchParams.get('token')

    if (!userId || !token) {
      setError('error.auth.invalidConfirmation')
      setIsLoading(false)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const result = await confirmEmail({ userId, token })
        if (!cancelled) {
          setMessage(result.message || 'auth.confirmEmail.success')
        }
      } catch (confirmError) {
        if (!cancelled) {
          setError(parseApiError(confirmError) || 'error.auth.invalidConfirmation')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams])

  return (
    <PageTemplate maxWidth="sm">
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('auth.confirmEmail.title')}
        </Typography>

        {isLoading ? (
          <Typography variant="body2" color="text.secondary">
            {t('auth.confirmEmail.loading')}
          </Typography>
        ) : null}

        {message ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t(message)}
          </Alert>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t(error)}
          </Alert>
        ) : null}

        {!isLoading ? (
          <Typography variant="body2" sx={{ mt: 2 }}>
            <Link component={RouterLink} to={ROUTES.login}>
              {t('auth.confirmEmail.loginLink')}
            </Link>
          </Typography>
        ) : null}
      </Paper>
    </PageTemplate>
  )
}
