import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import type { AbzaModalProps } from '../model/types'

export function AbzaModal({
  open,
  config,
  onClose,
  onSubmit,
  children,
  isSubmitting = false,
  maxWidth = 'sm',
}: AbzaModalProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle>{config.title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          {config.cancelLabel}
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={isSubmitting}>
          {config.submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
