import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { AbzaError } from '@features/abza-error'
import type { PositionMessageDto } from '@shared/types'
import { DiscussionComposer } from './DiscussionComposer'
import { DiscussionMessage } from './DiscussionMessage'

type PositionDiscussionProps = {
  messages: PositionMessageDto[]
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  canPost: boolean
  canDelete: boolean
  canLinkCandidateProfile: boolean
  onSubmit: (content: string) => Promise<void>
  onDelete: (messageId: number) => Promise<void>
  onClearError: () => void
}

export function PositionDiscussion({
  messages,
  isLoading,
  isSubmitting,
  error,
  canPost,
  canDelete,
  canLinkCandidateProfile,
  onSubmit,
  onDelete,
  onClearError,
}: PositionDiscussionProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <AbzaError error={error} onClose={onClearError} />

      {canPost ? (
        <DiscussionComposer disabled={!canPost} isSubmitting={isSubmitting} onSubmit={onSubmit} />
      ) : null}

      {messages.length === 0 ? (
        <Typography color="text.secondary">{t('positions.discussion.empty')}</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {messages.map((message) => (
            <DiscussionMessage
              key={message.id}
              message={message}
              canDelete={canDelete}
              linkAuthorToProfile={
                canLinkCandidateProfile && message.createdByRole.toLowerCase() === 'candidate'
              }
              onDelete={(messageId) => {
                void onDelete(messageId)
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
