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
  hideSubmit = false,
  maxWidth = 'sm',
  secondaryLabel,
  onSecondary,
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
        {secondaryLabel && onSecondary ? (
          <Button onClick={onSecondary} disabled={isLoading} sx={{ mr: 'auto' }}>
            {secondaryLabel}
          </Button>
        ) : null}
        <Button onClick={handleClose} disabled={isLoading}>
          {config.cancelLabel}
        </Button>
        {!hideSubmit && config.submitLabel && onSubmit ? (
          <Button variant="contained" onClick={onSubmit} disabled={isLoading || submitDisabled}>
            {config.submitLabel}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
