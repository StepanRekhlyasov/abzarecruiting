import { Navigate } from 'react-router-dom'
import { useUnit } from 'effector-react'
import { $session, isAdmin, isCandidate } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { PageTemplate } from '@/shared/ui'
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
    <PageTemplate>
      <Profile candidateId={session.id} />
    </PageTemplate>
  )
}
