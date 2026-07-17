import FilterListIcon from '@mui/icons-material/FilterList'
import Button from '@mui/material/Button'

type AbzaFilterButtonProps = {
  active: boolean
  onClick: () => void
  disabled?: boolean
  'aria-label': string
}

export function AbzaFilterButton({
  active,
  onClick,
  disabled = false,
  'aria-label': ariaLabel,
}: AbzaFilterButtonProps) {
  return (
    <Button
      variant={active ? 'contained' : 'outlined'}
      onClick={onClick}
      disabled={disabled}
      sx={
        active
          ? undefined
          : {
              color: 'action.active',
              borderColor: 'divider',
            }
      }
      aria-label={ariaLabel}
    >
      <FilterListIcon />
    </Button>
  )
}
