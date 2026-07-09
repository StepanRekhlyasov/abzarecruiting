import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUnit } from 'effector-react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { AppHeader } from '@features/app-header'
import { $session, isAdmin } from '@entities/user'
import { ROUTES } from '@shared/config/routes'

export function ProfileDetailPage() {
  const { t } = useTranslation()
  const { candidateId } = useParams<{ candidateId: string }>()
  const session = useUnit($session)

  if (!session) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (!isAdmin(session)) {
    return <Navigate to={ROUTES.home} replace />
  }

  if (!candidateId) {
    return <Navigate to={ROUTES.profile} replace />
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('profile.title')}
          </Typography>

          <Typography variant="body1" color="text.secondary">
            {t('profile.placeholder')}
          </Typography>
        </Box>
      </Container>
    </>
  )
}
