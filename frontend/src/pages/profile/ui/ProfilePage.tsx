import { Navigate } from 'react-router-dom'
import { useUnit } from 'effector-react'
import { $session, isAdmin, isCandidate, isRecruiter } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { PageTemplate } from '@/shared/ui'
import { ProfileView } from './ProfileView'

export function ProfilePage() {
  const session = useUnit($session)

  if (!session) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (!isCandidate(session) && !isRecruiter(session) && !isAdmin(session)) {
    return <Navigate to={ROUTES.home} replace />
  }

  return (
    <PageTemplate>
      <ProfileView userId={session.id} />
    </PageTemplate>
  )
}
