import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MDEditor from '@uiw/react-md-editor'
import { useTranslation } from 'react-i18next'
import { useThemeMode } from '@shared/config/theme'
import '@uiw/react-md-editor/markdown-editor.css'

type DiscussionComposerProps = {
  disabled?: boolean
  isSubmitting?: boolean
  onSubmit: (content: string) => Promise<void>
}

export function DiscussionComposer({
  disabled = false,
  isSubmitting = false,
  onSubmit,
}: DiscussionComposerProps) {
  const { t } = useTranslation()
  const { mode } = useThemeMode()
  const [content, setContent] = useState('')

  const isBusy = disabled || isSubmitting

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed) {
      return
    }

    await onSubmit(trimmed)
    setContent('')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }} data-color-mode={mode}>
      <MDEditor
        value={content}
        onChange={(next) => setContent(next ?? '')}
        height={220}
        preview="live"
        hideToolbar={isBusy}
        textareaProps={{
          placeholder: t('positions.discussion.placeholder'),
          disabled: isBusy,
        }}
      />

      <Button
        variant="contained"
        disabled={isBusy || content.trim().length === 0}
        onClick={() => void handleSubmit()}
        sx={{ alignSelf: 'flex-start', boxShadow: 'none' }}
      >
        {t('positions.discussion.submit')}
      </Button>
    </Box>
  )
}
