import { useTranslation } from 'react-i18next'
import { AttributesTable } from '@widgets/attributes-table'
import { PageTemplate } from '@/shared/ui'

export function AttributesPage() {
  const { t } = useTranslation()

  return (
    <PageTemplate title={t('attributes.title')}>
      <AttributesTable />
    </PageTemplate>
  )
}
