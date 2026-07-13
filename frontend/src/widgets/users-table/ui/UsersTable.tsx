import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { createChangeRoleFormConfig, createUserFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { formatDateTime } from '@shared/lib/date'
import type { UserListItem } from '@entities/user'
import { AbzaError } from '@features/abza-error'
import { AbzaForm } from '@features/abza-form'
import { AbzaModal } from '@features/abza-modal'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import { UsersTableProvider, useUsersTable } from '../model'
import { UsersTableToolbar } from './Toolbar'

function UsersTableContent() {
  const { t } = useTranslation()
  const {
    rows,
    totalCount,
    page,
    pageSize,
    selectedIds,
    isLoading,
    actionError,
    isCreateModalOpen,
    isChangeRoleModalOpen,
    sortBy,
    sortDir,
    setPage,
    setPageSize,
    setSelectedIds,
    setIsCreateModalOpen,
    setIsChangeRoleModalOpen,
    setActionError,
    handleSortChange,
    handleCreateSubmit,
    handleChangeRoleSubmit,
    handleCreateModalSubmit,
    handleChangeRoleModalSubmit,
    handleRowClick,
    createFormRef,
    changeRoleFormRef,
  } = useUsersTable()

  const createFormConfig = useMemo(() => createUserFormConfig(t), [i18n.language])
  const changeRoleFormConfig = useMemo(() => createChangeRoleFormConfig(t), [i18n.language])

  const columns = useMemo<AbzaTableColumn<UserListItem>[]>(
    () => [
      {
        id: 'firstName',
        label: t('profile.users.columns.firstName'),
        sortable: true,
        render: (row) => row.firstName,
      },
      {
        id: 'lastName',
        label: t('profile.users.columns.lastName'),
        sortable: true,
        render: (row) => row.lastName,
      },
      {
        id: 'email',
        label: t('profile.users.columns.email'),
        sortable: true,
        render: (row) => row.email,
      },
      {
        id: 'role',
        label: t('profile.users.columns.role'),
        sortable: true,
        render: (row) => t(`auth.roles.${row.role.toLowerCase()}`),
      },
      {
        id: 'createdAt',
        label: t('profile.users.columns.createdAt'),
        sortable: true,
        render: (row) => formatDateTime(row.createdAt),
      },
    ],
    [i18n.language],
  )

  return (
    <>
      <AbzaError error={actionError} sx={{ mb: 2 }} onClose={() => setActionError(null)} />

      <AbzaTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        toolbar={<UsersTableToolbar />}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(0)
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={handleRowClick}
        loading={isLoading}
        emptyMessage={t('profile.users.empty')}
        loadingMessage={t('profile.users.loading')}
      />

      <AbzaModal
        open={isCreateModalOpen}
        config={{
          title: t('profile.users.create.title'),
          submitLabel: t('profile.users.create.submit'),
          cancelLabel: t('profile.users.create.cancel'),
        }}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateModalSubmit}
        isLoading={isLoading}
      >
        <AbzaForm
          formRef={createFormRef}
          hideSubmitButton
          config={createFormConfig}
          onSubmit={handleCreateSubmit}
          isLoading={isLoading}
        />
      </AbzaModal>

      <AbzaModal
        open={isChangeRoleModalOpen}
        config={{
          title: t('profile.users.changeRole.title'),
          submitLabel: t('profile.users.changeRole.submit'),
          cancelLabel: t('profile.users.changeRole.cancel'),
        }}
        onOpenChange={setIsChangeRoleModalOpen}
        onSubmit={handleChangeRoleModalSubmit}
        isLoading={isLoading}
      >
        <AbzaForm
          formRef={changeRoleFormRef}
          hideSubmitButton
          config={changeRoleFormConfig}
          onSubmit={handleChangeRoleSubmit}
          isLoading={isLoading}
        />
      </AbzaModal>
    </>
  )
}

export function UsersTable() {
  return (
    <UsersTableProvider>
      <UsersTableContent />
    </UsersTableProvider>
  )
}
