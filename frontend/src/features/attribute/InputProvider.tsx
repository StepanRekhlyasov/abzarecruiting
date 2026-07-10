import { useState, type MouseEvent } from 'react'
import BackspaceIcon from '@mui/icons-material/Backspace'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { ProfileAttributeDto } from '@shared/types'

export type InputProviderProps = {
  attribute: ProfileAttributeDto
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  editable?: boolean
  deletable?: boolean
  tooltip?: string | null
  onDelete?: () => void
}

function FieldLabel({
  name,
  tooltip,
}: {
  name: string
  tooltip?: string | null
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
      <Typography variant="body2" component="label" color="text.primary">
        {name}
      </Typography>
      {tooltip ? (
        <>
          <IconButton
            size="small"
            onMouseEnter={handleOpen}
            onMouseLeave={handleClose}
            aria-label={tooltip}
            sx={{ p: 0.25 }}
          >
            <ErrorOutlineIcon fontSize="small" color="action" />
          </IconButton>
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={handleClose}
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
      ) : null}
    </Box>
  )
}

function AttributeInput({
  attribute,
  value,
  onChange,
  onBlur,
  disabled,
}: {
  attribute: ProfileAttributeDto
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled: boolean
}) {
  const inputType = attribute.inputType.toLowerCase()

  switch (inputType) {
    case 'textarea':
      return (
        <TextField
          fullWidth
          multiline
          minRows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
        />
      )
    case 'number':
      return (
        <TextField
          fullWidth
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
        />
      )
    case 'tel':
      return (
        <TextField
          fullWidth
          type="tel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
        />
      )
    case 'date':
      return (
        <TextField
          fullWidth
          type="date"
          value={value ? value.slice(0, 10) : ''}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
      )
    case 'checkbox':
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={value.toLowerCase() === 'true'}
              onChange={(event) => {
                onChange(event.target.checked ? 'True' : 'False')
                onBlur?.()
              }}
              disabled={disabled}
            />
          }
          label=""
        />
      )
    case 'select':
      return (
        <FormControl fullWidth size="small" disabled={disabled}>
          <Select
            displayEmpty
            value={value}
            onChange={(event) => onChange(String(event.target.value))}
            onBlur={onBlur}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {attribute.options.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )
    case 'period':
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
          }}
        >
          <TextField
            fullWidth
            type="date"
            label="From"
            value={value.split('|')[0] ?? ''}
            onChange={(event) => {
              const to = value.split('|')[1] ?? ''
              onChange(`${event.target.value}|${to}`)
            }}
            onBlur={onBlur}
            disabled={disabled}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            fullWidth
            type="date"
            label="To"
            value={value.split('|')[1] ?? ''}
            onChange={(event) => {
              const from = value.split('|')[0] ?? ''
              onChange(`${from}|${event.target.value}`)
            }}
            onBlur={onBlur}
            disabled={disabled}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
      )
    case 'image':
      return (
        <TextField
          fullWidth
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
          placeholder="https://"
        />
      )
    case 'text':
    default:
      return (
        <TextField
          fullWidth
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
        />
      )
  }
}

export function InputProvider({
  attribute,
  value,
  onChange,
  onBlur,
  editable = true,
  deletable = false,
  tooltip,
  onDelete,
}: InputProviderProps) {
  const disabled = !editable
  const showTooltip = tooltip ?? attribute.description

  return (
    <Box>
      <FieldLabel name={attribute.name} tooltip={showTooltip} />
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AttributeInput
            attribute={attribute}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
          />
        </Box>
        {deletable ? (
          <IconButton color="error" onClick={onDelete} disabled={disabled} aria-label="delete">
            <BackspaceIcon />
          </IconButton>
        ) : null}
      </Box>
    </Box>
  )
}
