import { useTranslation } from 'react-i18next'
import { ProjectsTable } from '@widgets/projects-table'
import { PageTemplate } from '@/shared/ui'

export function ProjectsPage() {
  const { t } = useTranslation()

  return (
    <PageTemplate title={t('projects.title')}>
      <ProjectsTable />
    </PageTemplate>
  )
}
