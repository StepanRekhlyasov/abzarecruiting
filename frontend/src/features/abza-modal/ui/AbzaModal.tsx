import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import type { AbzaModalProps } from '@shared/types'

export function AbzaModal({
  open,
  config,
  onOpenChange,
  onSubmit,
  children,
  isLoading = false,
  submitDisabled = false,
  maxWidth = 'sm',
}: AbzaModalProps) {
  const handleClose = () => {
    if (isLoading) {
      return
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle>{config.title}</DialogTitle>
      <DialogContent dividers>{open ? children : null}</DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          {config.cancelLabel}
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={isLoading || submitDisabled}>
          {config.submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
