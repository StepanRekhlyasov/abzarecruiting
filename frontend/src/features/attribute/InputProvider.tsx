import { useState, type ComponentType, type MouseEvent, type ReactNode } from 'react'
import BackspaceIcon from '@mui/icons-material/Backspace'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PhoneInputImport from 'react-phone-input-material-ui'
import type { ProfileAttributeDto } from '@shared/types'
import 'react-phone-input-material-ui/lib/style.css'

type PhoneInputModule = {
  default?: ComponentType<Record<string, unknown>>
  ReactPhoneInput?: { default?: ComponentType<Record<string, unknown>> }
}

const phoneInputModule = PhoneInputImport as unknown as PhoneInputModule
const PhoneInput = (phoneInputModule.ReactPhoneInput?.default ??
  phoneInputModule.default ??
  PhoneInputImport) as ComponentType<Record<string, unknown>>

function PhoneTextField(props: Record<string, unknown>) {
  return <TextField {...props} size="small" fullWidth />
}

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

function FieldTooltip({ tooltip }: { tooltip: string }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <IconButton
        size="small"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        aria-label={tooltip}
        edge="end"
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
  )
}

function tooltipAdornment(tooltip?: string | null): ReactNode {
  if (!tooltip) {
    return undefined
  }

  return (
    <InputAdornment position="end">
      <FieldTooltip tooltip={tooltip} />
    </InputAdornment>
  )
}

function AttributeInput({
  attribute,
  value,
  onChange,
  onBlur,
  disabled,
  tooltip,
}: {
  attribute: ProfileAttributeDto
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled: boolean
  tooltip?: string | null
}) {
  const inputType = attribute.inputType.toLowerCase()
  const label = attribute.name
  const endAdornment = tooltipAdornment(tooltip)

  switch (inputType) {
    case 'textarea':
      return (
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
          slotProps={{ input: { endAdornment } }}
        />
      )
    case 'number':
      return (
        <TextField
          fullWidth
          type="number"
          label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
          slotProps={{ input: { endAdornment } }}
        />
      )
    case 'tel':
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <PhoneInput
              value={value}
              onChange={(phone: string) => onChange(phone)}
              onBlur={() => onBlur?.()}
              component={PhoneTextField}
              variant="outlined"
              country="ge"
              disabled={disabled}
              label={label}
              specialLabel=""
              containerStyle={{ width: '100%' }}
            />
          </Box>
          {tooltip ? <FieldTooltip tooltip={tooltip} /> : null}
        </Box>
      )
    case 'date':
      return (
        <TextField
          fullWidth
          type="date"
          label={label}
          value={value ? value.slice(0, 10) : ''}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
          slotProps={{
            inputLabel: { shrink: true },
            input: { endAdornment },
          }}
        />
      )
    case 'checkbox':
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
            label={label}
          />
          {tooltip ? <FieldTooltip tooltip={tooltip} /> : null}
        </Box>
      )
    case 'select':
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel id={`attribute-${attribute.id}-label`}>{label}</InputLabel>
            <Select
              labelId={`attribute-${attribute.id}-label`}
              label={label}
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
          {tooltip ? <FieldTooltip tooltip={tooltip} /> : null}
        </Box>
      )
    case 'period':
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            alignItems: 'flex-start',
          }}
        >
          <TextField
            fullWidth
            type="date"
            label={`${label} (from)`}
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
            label={`${label} (to)`}
            value={value.split('|')[1] ?? ''}
            onChange={(event) => {
              const from = value.split('|')[0] ?? ''
              onChange(`${from}|${event.target.value}`)
            }}
            onBlur={onBlur}
            disabled={disabled}
            size="small"
            slotProps={{
              inputLabel: { shrink: true },
              input: { endAdornment },
            }}
          />
        </Box>
      )
    case 'image':
      return (
        <TextField
          fullWidth
          type="url"
          label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
          placeholder="https://"
          slotProps={{ input: { endAdornment } }}
        />
      )
    case 'text':
    default:
      return (
        <TextField
          fullWidth
          type="text"
          label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
          slotProps={{ input: { endAdornment } }}
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
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AttributeInput
          attribute={attribute}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          tooltip={showTooltip}
        />
      </Box>
      {deletable ? (
        <IconButton color="error" onClick={onDelete} disabled={disabled} aria-label="delete">
          <BackspaceIcon />
        </IconButton>
      ) : null}
    </Box>
  )
}
