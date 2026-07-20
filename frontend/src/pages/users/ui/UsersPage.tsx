import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUnit } from 'effector-react'
import { $session, isRecruiterOrAdmin } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { PageTemplate } from '@/shared/ui'
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
    <PageTemplate title={t('users.title')}>
      <UsersTable />
    </PageTemplate>
  )
}
