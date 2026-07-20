import { useTranslation } from 'react-i18next'
import { PageTemplate } from '@/shared/ui'

export function HomePage() {
  const { t } = useTranslation()

  return <PageTemplate title={t('home.title')} />
}
