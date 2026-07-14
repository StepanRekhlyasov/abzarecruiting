import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useUnit } from 'effector-react'
import { $session } from '@entities/user'
import { ROUTES } from '@shared/config/routes'

export function RequireAuth({ children }: PropsWithChildren) {
  const session = useUnit($session)

  if (!session) {
    return <Navigate to={ROUTES.login} replace />
  }

  return children
}
