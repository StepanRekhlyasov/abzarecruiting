import { Navigate } from 'react-router-dom'
import { useUnit } from 'effector-react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import { AppHeader } from '@features/app-header'
import { $session, isAdmin, isCandidate } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { Profile } from '@widgets/candidate-profile'

export function ProfilePage() {
  const session = useUnit($session)

  if (!session) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (!isCandidate(session) && !isAdmin(session)) {
    return <Navigate to={ROUTES.home} replace />
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Profile candidateId={session.id} />
        </Box>
      </Container>
    </>
  )
}
