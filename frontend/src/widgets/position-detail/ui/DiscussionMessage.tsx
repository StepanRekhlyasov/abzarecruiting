import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { MuiMarkdown } from 'mui-markdown'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import type { PositionMessageDto } from '@shared/types'
import { profileDetailPath } from '@shared/config/routes'
import { formatDateTime } from '@shared/lib/date'

type DiscussionMessageProps = {
  message: PositionMessageDto
  canDelete?: boolean
  linkAuthorToProfile?: boolean
  onDelete?: (messageId: number) => void
}

export function DiscussionMessage({
  message,
  canDelete = false,
  linkAuthorToProfile = false,
  onDelete,
}: DiscussionMessageProps) {
  const { t } = useTranslation()
  const authorName = message.createdByName || t('positions.detail.unknownAuthor')
  const roleLabel = message.createdByRole
    ? t(`auth.roles.${message.createdByRole.toLowerCase()}`, message.createdByRole)
    : ''

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1 }}>
            {linkAuthorToProfile ? (
              <Link
                component={RouterLink}
                to={profileDetailPath(message.createdById)}
                underline="hover"
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
              >
                {authorName}
              </Link>
            ) : (
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {authorName}
              </Typography>
            )}
            {roleLabel ? (
              <Typography variant="body2" color="text.secondary">
                {roleLabel}
              </Typography>
            ) : null}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {formatDateTime(message.createdAt)}
          </Typography>
        </Box>

        {canDelete ? (
          <IconButton
            size="small"
            aria-label={t('positions.discussion.delete')}
            onClick={() => onDelete?.(message.id)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Box>

      <Box
        sx={{
          '& p': { m: 0, mb: 1 },
          '& p:last-child': { mb: 0 },
          '& pre': { overflowX: 'auto' },
        }}
      >
        <MuiMarkdown>{message.content}</MuiMarkdown>
      </Box>
    </Box>
  )
}
