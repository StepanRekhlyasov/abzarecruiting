import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { createChangeRoleFormConfig, createUserFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import { formatDateTime } from '@shared/lib/date'
import type { UserListItem } from '@entities/user'
import { AbzaError } from '@features/abza-error'
import { AbzaForm } from '@features/abza-form'
import { AbzaModal } from '@features/abza-modal'
import { AbzaTable } from '@features/abza-table'
import type { AbzaTableColumn } from '@features/abza-table'
import { AbzaTableToolbar } from '@features/abza-table-toolbar'
import { UsersTableProvider, useUsersTable } from '../model'
import { UsersFilterModal } from './FilterModal'

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
    manageSuccess,
    isCreateModalOpen,
    isChangeRoleModalOpen,
    isManageModalOpen,
    managedUser,
    sortBy,
    sortDir,
    setPage,
    setPageSize,
    setSelectedIds,
    setIsCreateModalOpen,
    setIsChangeRoleModalOpen,
    setIsManageModalOpen,
    setActionError,
    setManageSuccess,
    handleSortChange,
    handleCreateSubmit,
    handleChangeRoleSubmit,
    handleCreateModalSubmit,
    handleChangeRoleModalSubmit,
    handleRowClick,
    handleSetLockout,
    handleSetActivation,
    handleSendActivationEmail,
    handleOpenCandidateProfile,
    handleFilter,
    handleCreateClick,
    handleDeleteSelected,
    handleBulkChangeRoleClick,
    isFilterActive,
    setIsFilterModalOpen,
    createFormRef,
    changeRoleFormRef,
    canManageUsers,
  } = useUsersTable()

  const createFormConfig = useMemo(() => createUserFormConfig(t), [i18n.language])
  const changeRoleFormConfig = useMemo(() => createChangeRoleFormConfig(t), [i18n.language])

  const columns = useMemo<AbzaTableColumn<UserListItem>[]>(() => {
    const next: AbzaTableColumn<UserListItem>[] = [
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
    ]

    if (canManageUsers) {
      next.push(
        {
          id: 'isLockedOut',
          label: t('profile.users.columns.isLockedOut'),
          sortable: true,
          render: (row) => t(row.isLockedOut ? 'common.yes' : 'common.no'),
        },
        {
          id: 'emailConfirmed',
          label: t('profile.users.columns.emailConfirmed'),
          sortable: true,
          render: (row) => t(row.emailConfirmed ? 'common.yes' : 'common.no'),
        },
      )
    }

    next.push({
      id: 'createdAt',
      label: t('profile.users.columns.createdAt'),
      sortable: true,
      render: (row) => formatDateTime(row.createdAt),
    })

    return next
  }, [canManageUsers, i18n.language])

  return (
    <>
      <AbzaError error={actionError} sx={{ mb: 2 }} onClose={() => setActionError(null)} />

      <AbzaTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        toolbar={
          <AbzaTableToolbar
            disabled={isLoading}
            textSearch={{
              label: t('profile.users.search'),
              onSearch: handleFilter,
            }}
            filter={
              canManageUsers
                ? {
                    active: isFilterActive,
                    onClick: () => setIsFilterModalOpen(true),
                    'aria-label': t('profile.users.actions.filter'),
                  }
                : undefined
            }
            create={canManageUsers ? { onClick: handleCreateClick } : undefined}
            changeRole={
              canManageUsers
                ? {
                    onClick: handleBulkChangeRoleClick,
                    disabled: selectedIds.length === 0,
                    title: t('profile.users.actions.changeRoleSelected'),
                  }
                : undefined
            }
            delete={
              canManageUsers
                ? {
                    onClick: handleDeleteSelected,
                    disabled: selectedIds.length === 0,
                  }
                : undefined
            }
          />
        }
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
        selectable={canManageUsers}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={handleRowClick}
        loading={isLoading}
        emptyMessage={t('profile.users.empty')}
        loadingMessage={t('profile.users.loading')}
      />

      {canManageUsers ? (
        <>
          <UsersFilterModal />
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

          <AbzaModal
            open={isManageModalOpen}
            config={{
              title: t('profile.users.manage.title'),
              cancelLabel: t('profile.users.manage.close'),
            }}
            hideSubmit
            onOpenChange={(open) => {
              setIsManageModalOpen(open)
              if (!open) {
                setManageSuccess(null)
              }
            }}
            isLoading={isLoading}
          >
            {managedUser ? (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle1">
                    {managedUser.firstName} {managedUser.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {managedUser.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(`auth.roles.${managedUser.role.toLowerCase()}`)}
                  </Typography>
                </Box>

                {manageSuccess ? (
                  <Alert severity="success" onClose={() => setManageSuccess(null)}>
                    {t(manageSuccess)}
                  </Alert>
                ) : null}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={isLoading || managedUser.isLockedOut}
                    onClick={() => void handleSetLockout(true)}
                  >
                    {t('profile.users.manage.lock')}
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={isLoading || !managedUser.isLockedOut}
                    onClick={() => void handleSetLockout(false)}
                  >
                    {t('profile.users.manage.unlock')}
                  </Button>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="outlined"
                    color="success"
                    disabled={isLoading || managedUser.emailConfirmed}
                    onClick={() => void handleSetActivation(true)}
                  >
                    {t('profile.users.manage.activate')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={isLoading || !managedUser.emailConfirmed}
                    onClick={() => void handleSetActivation(false)}
                  >
                    {t('profile.users.manage.deactivate')}
                  </Button>
                </Stack>

                <Button
                  variant="contained"
                  disabled={isLoading || managedUser.emailConfirmed}
                  onClick={() => void handleSendActivationEmail()}
                  sx={{ boxShadow: 'none', alignSelf: 'flex-start' }}
                >
                  {t('profile.users.manage.sendActivationEmail')}
                </Button>

                {managedUser.role === 'Candidate' ||
                managedUser.role === 'Recruiter' ||
                managedUser.role === 'Admin' ? (
                  <Button
                    variant="contained"
                    disabled={isLoading}
                    onClick={handleOpenCandidateProfile}
                    sx={{ boxShadow: 'none', alignSelf: 'flex-start' }}
                  >
                    {t('profile.users.manage.openProfile')}
                  </Button>
                ) : null}
              </Stack>
            ) : null}
          </AbzaModal>
        </>
      ) : null}
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
