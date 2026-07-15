import SaveIcon from '@mui/icons-material/Save'
import IconButton from '@mui/material/IconButton'

type AutosaveButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  fontSize?: number
}

export function AutosaveButton({
  label,
  onClick,
  disabled = false,
  active = false,
  fontSize = 34,
}: AutosaveButtonProps) {
  return (
    <IconButton
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      size="small"
      sx={{
        color: active ? 'success.main' : 'text.disabled',
        opacity: active ? 1 : 0.35,
        transition: 'color 0.2s ease, opacity 0.2s ease',
      }}
    >
      <SaveIcon sx={{ fontSize }} />
    </IconButton>
  )
}
