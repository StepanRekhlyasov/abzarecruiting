import { useTranslation } from 'react-i18next'
import { PositionsTable } from '@widgets/positions-table'
import { PageTemplate } from '@/shared/ui'

export function PositionsPage() {
  const { t } = useTranslation()

  return (
    <PageTemplate title={t('positions.title')}>
      <PositionsTable />
    </PageTemplate>
  )
}
