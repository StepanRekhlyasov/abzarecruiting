import { useTranslation } from 'react-i18next'
import { HomeDashboard } from '@widgets/home-dashboard'
import { PageTemplate } from '@/shared/ui'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <PageTemplate title={t('home.title')}>
      <HomeDashboard />
    </PageTemplate>
  )
}
