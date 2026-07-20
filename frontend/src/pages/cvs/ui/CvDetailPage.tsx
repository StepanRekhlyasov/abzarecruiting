import { Navigate, useParams } from 'react-router-dom'
import { useUnit } from 'effector-react'
import { $session } from '@entities/user'
import { ROUTES } from '@shared/config/routes'
import { PageTemplate } from '@/shared/ui'
import { ResumeDetail } from '@widgets/resume-detail'

export function CvDetailPage() {
  const { id } = useParams<{ id: string }>()
  const session = useUnit($session)
  const resumeId = Number(id)

  if (!session) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (!Number.isFinite(resumeId) || resumeId <= 0) {
    return <Navigate to={ROUTES.cvs} replace />
  }

  return (
    <PageTemplate>
      <ResumeDetail resumeId={resumeId} />
    </PageTemplate>
  )
}
