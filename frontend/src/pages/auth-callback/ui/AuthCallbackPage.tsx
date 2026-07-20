import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { authSucceeded, getCurrentUser } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { parseApiError } from '@shared/lib/errors'
import { saveAccessToken } from '@shared/lib/auth/accessToken'
import { PageTemplate } from '@/shared/ui'

function readHashParams(): URLSearchParams {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  return new URLSearchParams(hash)
}

export function AuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = readHashParams()
    const accessToken = params.get('accessToken')
    const expiresAt = params.get('expiresAt')

    if (!accessToken) {
      setError('error.auth.externalLoginFailed')
      return
    }

    let cancelled = false

    void (async () => {
      try {
        saveAccessToken(accessToken)
        const user = await getCurrentUser()

        if (cancelled) {
          return
        }

        authSucceeded({
          accessToken,
          expiresAt: expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
        })

        window.history.replaceState(null, '', window.location.pathname)
        navigate(ROUTES.home, { replace: true })
      } catch (callbackError) {
        if (!cancelled) {
          setError(parseApiError(callbackError) || 'error.auth.externalLoginFailed')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <PageTemplate maxWidth="sm">
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('auth.callback.title')}
        </Typography>

        {error ? (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>
              {t(error)}
            </Alert>
            <Typography variant="body2">
              <Link component={RouterLink} to={ROUTES.login}>
                {t('auth.callback.loginLink')}
              </Link>
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('auth.callback.loading')}
          </Typography>
        )}
      </Paper>
    </PageTemplate>
  )
}
