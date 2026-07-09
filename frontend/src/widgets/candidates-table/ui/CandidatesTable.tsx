import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import type { CandidateListItem } from '@shared/types'
import { i18n } from '@shared/config/i18n'
import { CandidatesTableProvider, useCandidatesTable } from '../model'
import { CandidatesTableToolbar } from './Toolbar'

function CandidatesTableContent() {
  const { t } = useTranslation()
  const {
    rows,
    totalCount,
    page,
    pageSize,
    isLoading,
    setPage,
    setPageSize,
    handleRowClick,
  } = useCandidatesTable()

  const columns = useMemo<AbzaTableColumn<CandidateListItem>[]>(
    () => [
      {
        id: 'firstName',
        label: t('profile.candidates.columns.firstName'),
        render: (row) => row.firstName,
      },
      {
        id: 'lastName',
        label: t('profile.candidates.columns.lastName'),
        render: (row) => row.lastName,
      },
      {
        id: 'email',
        label: t('profile.candidates.columns.email'),
        render: (row) => row.email,
      },
    ],
    [i18n.language],
  )

  return (
    <AbzaTable
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      toolbar={<CandidatesTableToolbar />}
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size)
        setPage(0)
      }}
      onRowClick={handleRowClick}
      loading={isLoading}
      emptyMessage={t('profile.candidates.empty')}
      loadingMessage={t('profile.candidates.loading')}
    />
  )
}

export function CandidatesTable() {
  return (
    <CandidatesTableProvider>
      <CandidatesTableContent />
    </CandidatesTableProvider>
  )
}
