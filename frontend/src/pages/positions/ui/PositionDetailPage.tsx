import { Navigate, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import { AppHeader } from '@features/app-header'
import { ROUTES } from '@shared/config/routes'
import { PositionDetail } from '@widgets/position-detail'

export function PositionDetailPage() {
  const { positionId } = useParams<{ positionId: string }>()
  const id = Number(positionId)

  if (!Number.isFinite(id) || id <= 0) {
    return <Navigate to={ROUTES.positions} replace />
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <PositionDetail positionId={id} />
        </Box>
      </Container>
    </>
  )
}
