import { useState, type ReactNode } from 'react'
import AddIcon from '@mui/icons-material/Add'
import BackspaceIcon from '@mui/icons-material/Backspace'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DescriptionIcon from '@mui/icons-material/Description'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import { TagsField } from '@entities/tag'
import { AbzaFilterButton } from '@features/abza-filter'
import { AsyncEntityTags } from '@shared/ui/inputs'
import type { AbzaTableToolbarAction, AbzaTableToolbarProps } from '../model/types'

const iconButtonSx = { boxShadow: 'none', minWidth: 40 } as const

function ActionButton({
  action,
  disabled,
  color,
  variant = 'contained',
  children,
}: {
  action: AbzaTableToolbarAction
  disabled?: boolean
  color?: 'error' | 'primary'
  variant?: 'contained' | 'outlined'
  children: ReactNode
}) {
  const button = (
    <Button
      variant={variant}
      color={color}
      onClick={action.onClick}
      disabled={disabled || action.disabled}
      sx={variant === 'contained' ? iconButtonSx : { minWidth: 40 }}
      aria-label={action['aria-label']}
      title={action.title}
    >
      {children}
    </Button>
  )

  if (!action.title && !action['aria-label']) {
    return button
  }

  return (
    <Tooltip title={action.title ?? action['aria-label'] ?? ''}>
      <span>{button}</span>
    </Tooltip>
  )
}

export function AbzaTableToolbar({
  disabled = false,
  textSearch,
  tagsSearch,
  asyncTagsSearch,
  filter,
  create,
  delete: deleteAction,
  duplicate,
  changeRole,
  link,
  unlink,
  createResumes,
  children,
}: AbzaTableToolbarProps) {
  const [searchInput, setSearchInput] = useState('')

  const applyTextSearch = () => {
    textSearch?.onSearch(searchInput)
  }

  const hasActions = Boolean(
    textSearch || filter || create || deleteAction || duplicate || changeRole || link || unlink || createResumes,
  )

  return (
    <>
      <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
        {(textSearch || tagsSearch || asyncTagsSearch) && (
          <Grid size={{ xs: 12, sm: 'grow' }} sx={{ minWidth: 0 }}>
            {textSearch && (
              <TextField
                size="small"
                label={textSearch.label}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    applyTextSearch()
                  }
                }}
                disabled={disabled}
                sx={{ width: '100%', minWidth: 0 }}
              />
            )}
            {tagsSearch && (
              <TagsField
                label={tagsSearch.label}
                value={tagsSearch.value}
                onChange={tagsSearch.onChange}
                allowCreate={tagsSearch.allowCreate}
                createOnSelect={tagsSearch.createOnSelect}
                createOptionLabel={tagsSearch.createOptionLabel}
                disabled={disabled}
                size="small"
                sx={{ width: '100%', minWidth: 0 }}
              />
            )}
            {asyncTagsSearch && (
              <AsyncEntityTags
                label={asyncTagsSearch.label}
                value={asyncTagsSearch.value}
                onChange={asyncTagsSearch.onChange}
                loadOptions={asyncTagsSearch.loadOptions}
                allowCreate={asyncTagsSearch.allowCreate}
                createOptionLabel={asyncTagsSearch.createOptionLabel}
                disabled={disabled}
                size="small"
                sx={{ width: '100%', minWidth: 0 }}
              />
            )}
          </Grid>
        )}

        {hasActions && (
          <Grid size={{ xs: 12, sm: 'auto' }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {textSearch && (
              <Button variant="outlined" onClick={applyTextSearch} disabled={disabled} sx={{ minWidth: 40 }}>
                <SearchIcon />
              </Button>
            )}
            {filter && (
              <AbzaFilterButton
                active={filter.active}
                onClick={filter.onClick}
                disabled={disabled}
                aria-label={filter['aria-label']}
              />
            )}
            {create && (
              <ActionButton action={create} disabled={disabled}>
                <AddIcon />
              </ActionButton>
            )}
            {duplicate && (
              <ActionButton action={duplicate} disabled={disabled}>
                <ContentCopyIcon />
              </ActionButton>
            )}
            {changeRole && (
              <ActionButton action={changeRole} disabled={disabled}>
                <ManageAccountsIcon />
              </ActionButton>
            )}
            {deleteAction && (
              <ActionButton action={deleteAction} disabled={disabled} color="error">
                <BackspaceIcon />
              </ActionButton>
            )}
            {link && (
              <ActionButton action={link} disabled={disabled}>
                <PlaylistAddIcon />
              </ActionButton>
            )}
            {unlink && (
              <ActionButton action={unlink} disabled={disabled} color="error" variant="outlined">
                <PlaylistRemoveIcon />
              </ActionButton>
            )}
            {createResumes && (
              <Button
                variant="contained"
                onClick={createResumes.onClick}
                disabled={disabled || createResumes.disabled}
                sx={{
                  ...iconButtonSx,
                  px: { xs: 1, sm: 2 },
                  '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
                }}
                startIcon={<DescriptionIcon />}
                aria-label={createResumes['aria-label'] ?? createResumes.label}
                title={createResumes.title}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {createResumes.label}
                </Box>
              </Button>
            )}
          </Grid>
        )}
      </Grid>
      {children}
    </>
  )
}
