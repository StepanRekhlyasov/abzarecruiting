import { Navigate, useParams } from 'react-router-dom'
import { useUnit } from 'effector-react'
import { $session, isAdmin } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { PageTemplate } from '@/shared/ui'
import { ProfileView } from './ProfileView'

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
    return <Navigate to={ROUTES.users} replace />
  }

  return (
    <PageTemplate>
      <ProfileView userId={candidateId} />
    </PageTemplate>
  )
}
