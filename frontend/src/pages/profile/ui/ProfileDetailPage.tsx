import { Navigate, useParams } from 'react-router-dom'
import { useUnit } from 'effector-react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import { AppHeader } from '@features/app-header'
import { $session, isAdmin } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { Profile } from '@widgets/candidate-profile'

export function ProfileDetailPage() {
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
          <Profile candidateId={candidateId} />
        </Box>
      </Container>
    </>
  )
}
