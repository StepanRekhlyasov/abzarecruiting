import { Navigate, useParams } from 'react-router-dom'
import { ROUTES } from '@shared/config/routes'
import { PageTemplate } from '@/shared/ui'
import { PositionDetail } from '@widgets/position-detail'

export function PositionDetailPage() {
  const { positionId } = useParams<{ positionId: string }>()
  const id = Number(positionId)

  if (!Number.isFinite(id) || id <= 0) {
    return <Navigate to={ROUTES.positions} replace />
  }

  return (
    <PageTemplate>
      <PositionDetail positionId={id} />
    </PageTemplate>
  )
}
