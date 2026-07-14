import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUnit } from 'effector-react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { AppHeader } from '@features/app-header'
import { $session, isRecruiterOrAdmin } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { UsersTable } from '@widgets/users-table'

export function UsersPage() {
  const { t } = useTranslation()
  const session = useUnit($session)

  if (!session) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (!isRecruiterOrAdmin(session)) {
    return <Navigate to={ROUTES.home} replace />
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('users.title')}
          </Typography>

          <UsersTable />
        </Box>
      </Container>
    </>
  )
}
