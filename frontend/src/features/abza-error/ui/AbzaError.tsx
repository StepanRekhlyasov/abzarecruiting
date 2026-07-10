import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import type { SxProps, Theme } from '@mui/material/styles'
import { resolveErrorMessage } from '@shared/lib/errors'
import './style.css'

export const OLD_VERSION_ERROR_KEY = 'error.oldVersion'

export type AbzaErrorProps = {
  error: string | null | undefined
  onClose?: () => void
  sx?: SxProps<Theme>
}

export function AbzaError({ error, onClose, sx }: AbzaErrorProps) {
  const message = resolveErrorMessage(error)

  if (!message) {
    return null
  }

  const isOldVersion = error === OLD_VERSION_ERROR_KEY

  return (
    <Alert
      severity="error"
      sx={sx}
      onClose={onClose}
      className="myAlert"
      action={
        isOldVersion ? (
          <IconButton
            color="inherit"
            size="small"
            onClick={() => window.location.reload()}
            aria-label="reload"
          >
            <RefreshIcon fontSize="inherit" />
          </IconButton>
        ) : undefined
      }
    >
      {message}
    </Alert>
  )
}
