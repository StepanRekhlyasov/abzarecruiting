import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import type { SxProps, Theme } from '@mui/material/styles'
import { resolveErrorMessage, UNKNOWN_ERROR_KEY } from '@shared/lib/errors'
import './style.css'

export const OLD_VERSION_ERROR_KEY = 'error.oldVersion'

const RELOADABLE_ERROR_KEYS = new Set([OLD_VERSION_ERROR_KEY, UNKNOWN_ERROR_KEY])

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

  const showReload = error != null && RELOADABLE_ERROR_KEYS.has(error)

  return (
    <Alert
      severity="error"
      sx={sx}
      onClose={onClose}
      className="myAlert"
      action={
        showReload ? (
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
