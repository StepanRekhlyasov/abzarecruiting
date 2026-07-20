import { useTranslation } from 'react-i18next'
import { TagsTable } from '@widgets/tags-table'
import { PageTemplate } from '@/shared/ui'

export function TagsPage() {
  const { t } = useTranslation()

  return (
    <PageTemplate title={t('tags.title')}>
      <TagsTable />
    </PageTemplate>
  )
}
