import { useTranslation } from 'react-i18next'
import { CvsTable } from '@widgets/cvs-table'
import { PageTemplate } from '@/shared/ui'

export function CvsPage() {
  const { t } = useTranslation()

  return (
    <PageTemplate title={t('cvs.title')}>
      <CvsTable />
    </PageTemplate>
  )
}
