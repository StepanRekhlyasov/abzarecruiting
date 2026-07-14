import { useState, type MouseEvent } from 'react'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import Typography from '@mui/material/Typography'

export function FieldTooltip({ tooltip }: { tooltip: string }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  return (
    <>
      <IconButton
        size="small"
        onMouseEnter={(event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
        onMouseLeave={() => setAnchorEl(null)}
        aria-label={tooltip}
        edge="end"
        sx={{ p: 0.25 }}
      >
        <ErrorOutlineIcon fontSize="small" color="action" />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        disableRestoreFocus
        sx={{ pointerEvents: 'none' }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Typography variant="body2" sx={{ p: 1.5, maxWidth: 280 }}>
          {tooltip}
        </Typography>
      </Popover>
    </>
  )
}
