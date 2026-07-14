import { Navigate } from 'react-router-dom'
import { useUnit } from 'effector-react'
import { $session } from '@entities/user'
import { homeRedirectPath } from '@shared/config/routes'

export function HomePage() {
  const session = useUnit($session)

  return <Navigate to={homeRedirectPath(session)} replace />
}
