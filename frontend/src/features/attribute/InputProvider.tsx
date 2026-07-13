import { useRef, useState, type ChangeEvent, type ComponentType, type MouseEvent, type ReactNode } from 'react'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import BackspaceIcon from '@mui/icons-material/Backspace'
import ClearIcon from '@mui/icons-material/Clear'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PhoneInputImport from 'react-phone-input-material-ui'
import { useTranslation } from 'react-i18next'
import { uploadFile } from '@shared/api/uploadApi'
import { parseApiError, resolveErrorMessage } from '@shared/lib/errors'
import {
  MAX_ATTRIBUTE_FILE_SIZE_BYTES,
  isFileAttributeValue,
  type AttributeDraftValue,
  type FileAttributeValue,
  type ProfileAttributeDto,
} from '@shared/types'
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
  value: AttributeDraftValue
  onChange: (value: AttributeDraftValue) => void
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

function FileAttributeInput({
  kind,
  label,
  value,
  onChange,
  onBlur,
  disabled,
  tooltip,
}: {
  kind: 'image' | 'file'
  label: string
  value: AttributeDraftValue
  onChange: (value: AttributeDraftValue) => void
  onBlur?: () => void
  disabled: boolean
  tooltip?: string | null
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const parsed: FileAttributeValue | null = isFileAttributeValue(value) ? value : null
  const accept = kind === 'image' ? 'image/*' : undefined

  const handlePick = () => {
    inputRef.current?.click()
  }

  const handleClear = () => {
    setError(null)
    onChange('')
    onBlur?.()
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (file.size > MAX_ATTRIBUTE_FILE_SIZE_BYTES) {
      setError(t('error.files.tooLarge'))
      return
    }

    if (kind === 'image' && !file.type.startsWith('image/')) {
      setError(t('error.files.invalidImageType'))
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const uploaded = await uploadFile(file, kind)
      onChange({
        uid: uploaded.uid,
        url: uploaded.url,
        name: uploaded.name,
      })
      onBlur?.()
    } catch (uploadError) {
      setError(resolveErrorMessage(parseApiError(uploadError)) ?? t('error.files.upload'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
          {label}
        </Typography>
        {tooltip ? <FieldTooltip tooltip={tooltip} /> : null}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        disabled={disabled || isUploading}
        onChange={(event) => {
          void handleFileChange(event)
        }}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={
            isUploading ? (
              <CircularProgress size={16} color="inherit" />
            ) : kind === 'image' ? (
              <CloudUploadIcon />
            ) : (
              <AttachFileIcon />
            )
          }
          onClick={handlePick}
          disabled={disabled || isUploading}
        >
          {parsed
            ? t(kind === 'image' ? 'attributes.file.replaceImage' : 'attributes.file.replaceFile')
            : t(kind === 'image' ? 'attributes.file.uploadImage' : 'attributes.file.uploadFile')}
        </Button>

        {parsed && !disabled ? (
          <IconButton size="small" onClick={handleClear} aria-label={t('attributes.file.clear')} disabled={isUploading}>
            <ClearIcon fontSize="small" />
          </IconButton>
        ) : null}

        <Typography variant="caption" color="text.secondary">
          {t('attributes.file.maxSize')}
        </Typography>
      </Box>

      {parsed ? (
        kind === 'image' ? (
          <Box
            component="img"
            src={parsed.url}
            alt={parsed.name}
            sx={{
              mt: 0.5,
              maxWidth: 240,
              maxHeight: 160,
              objectFit: 'contain',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}
          />
        ) : (
          <Link href={parsed.url} target="_blank" rel="noopener noreferrer" underline="hover" variant="body2">
            {parsed.name}
          </Link>
        )
      ) : null}

      {error ? <FormHelperText error>{error}</FormHelperText> : null}
    </Box>
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
  value: AttributeDraftValue
  onChange: (value: AttributeDraftValue) => void
  onBlur?: () => void
  disabled: boolean
  tooltip?: string | null
}) {
  const inputType = attribute.inputType.toLowerCase()
  const label = attribute.name
  const endAdornment = tooltipAdornment(tooltip)
  const stringValue = typeof value === 'string' ? value : ''

  switch (inputType) {
    case 'textarea':
      return (
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={label}
          value={stringValue}
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
          value={stringValue}
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
              value={stringValue}
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
          value={stringValue ? stringValue.slice(0, 10) : ''}
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
                checked={stringValue.toLowerCase() === 'true'}
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
              value={stringValue}
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
            value={stringValue.split('|')[0] ?? ''}
            onChange={(event) => {
              const to = stringValue.split('|')[1] ?? ''
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
            value={stringValue.split('|')[1] ?? ''}
            onChange={(event) => {
              const from = stringValue.split('|')[0] ?? ''
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
        <FileAttributeInput
          kind="image"
          label={label}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          tooltip={tooltip}
        />
      )
    case 'file':
      return (
        <FileAttributeInput
          kind="file"
          label={label}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          tooltip={tooltip}
        />
      )
    case 'email':
      return (
        <TextField
          fullWidth
          type="email"
          label={label}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          size="small"
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
          value={stringValue}
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
