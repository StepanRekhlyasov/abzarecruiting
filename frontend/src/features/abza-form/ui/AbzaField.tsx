import type { ComponentType, ReactNode } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import PhoneInputImport from 'react-phone-input-material-ui'
import { AsyncEntitySelect, AsyncEntityTags, OptionTags } from '@shared/ui/inputs'
import type { AbzaFieldConfig, AbzaFormValue, AbzaSelectOption } from '@shared/types'
import { FieldTooltip } from './FieldTooltip'
import { FileField } from './FileField'
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

function tooltipAdornment(tooltip?: string): ReactNode {
  if (!tooltip) {
    return undefined
  }

  return (
    <InputAdornment position="end">
      <FieldTooltip tooltip={tooltip} />
    </InputAdornment>
  )
}

function asString(value: AbzaFormValue): string {
  return typeof value === 'string' ? value : ''
}

export type AbzaFieldProps = {
  field: AbzaFieldConfig
  value: AbzaFormValue
  error?: string
  disabled?: boolean
  onChange: (value: AbzaFormValue) => void
  onBlur?: () => void
  onDelete?: () => void
}

export function AbzaField({
  field,
  value,
  error,
  disabled = false,
  onChange,
  onBlur,
  onDelete,
}: AbzaFieldProps) {
  const hasError = Boolean(error)
  const isDisabled = disabled || Boolean(field.disabled)
  const size = field.size ?? 'medium'
  const endAdornment = tooltipAdornment(field.tooltip)
  const stringValue = asString(value)

  let control: ReactNode

  switch (field.type) {
    case 'optionTags':
      control = (
        <OptionTags
          label={field.label}
          options={Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []}
          onChange={(options) => onChange(options)}
          disabled={isDisabled}
        />
      )
      break

    case 'asyncEntityTags':
      control = (
        <AsyncEntityTags
          label={field.label}
          value={
            Array.isArray(value)
              ? value.filter(
                  (item): item is AbzaSelectOption =>
                    typeof item === 'object' && item !== null && 'value' in item && 'label' in item,
                )
              : []
          }
          onChange={(options) => onChange(options)}
          loadOptions={field.loadOptions ?? (async () => [])}
          allowCreate={field.allowCreateOptions}
          disabled={isDisabled}
          error={hasError}
          helperText={error}
        />
      )
      break

    case 'asyncEntitySelect':
      control = (
        <AsyncEntitySelect
          label={field.label}
          value={
            typeof value === 'object' && value !== null && !Array.isArray(value) && 'value' in value && 'label' in value
              ? value
              : null
          }
          onChange={(option) => onChange(option)}
          loadOptions={field.loadOptions ?? (async () => [])}
          disabled={isDisabled}
          error={hasError}
          helperText={error}
        />
      )
      break

    case 'select': {
      const selectOptions = field.options ?? []
      const selectedOption = selectOptions.find((option) => option.value === stringValue) ?? null
      const isRequired = Boolean(field.validation?.required)

      control = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Autocomplete
            fullWidth
            size={size}
            options={selectOptions}
            value={selectedOption}
            disabled={isDisabled}
            disableClearable={isRequired}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, selected) => option.value === selected.value}
            onChange={(_, nextValue) => onChange(nextValue?.value ?? '')}
            onBlur={onBlur}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                name={field.name}
                error={hasError}
                helperText={error}
              />
            )}
          />
          {field.tooltip ? <FieldTooltip tooltip={field.tooltip} /> : null}
        </Box>
      )
      break
    }

    case 'textarea':
      control = (
        <TextField
          fullWidth
          multiline
          minRows={3}
          id={field.name}
          name={field.name}
          label={field.label}
          value={stringValue}
          error={hasError}
          helperText={error}
          disabled={isDisabled}
          size={size}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          slotProps={{ input: { endAdornment } }}
        />
      )
      break

    case 'tel':
      control = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <PhoneInput
              value={stringValue}
              onChange={(phone: string) => onChange(phone)}
              onBlur={() => onBlur?.()}
              component={PhoneTextField}
              variant="outlined"
              disabled={isDisabled}
              label={field.label}
              specialLabel=""
              containerStyle={{ width: '100%' }}
              disableCountryCode
              disableInitialCountryGuess
              disableCountryGuess
            />
          </Box>
          {field.tooltip ? <FieldTooltip tooltip={field.tooltip} /> : null}
        </Box>
      )
      break

    case 'checkbox':
      control = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={stringValue.toLowerCase() === 'true'}
                onChange={(event) => {
                  onChange(event.target.checked ? 'True' : 'False')
                  onBlur?.()
                }}
                disabled={isDisabled}
              />
            }
            label={field.label}
          />
          {field.tooltip ? <FieldTooltip tooltip={field.tooltip} /> : null}
        </Box>
      )
      break

    case 'period':
      control = (
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
            label={`${field.label} (from)`}
            value={stringValue.split('|')[0] ?? ''}
            onChange={(event) => {
              const to = stringValue.split('|')[1] ?? ''
              onChange(`${event.target.value}|${to}`)
            }}
            onBlur={onBlur}
            disabled={isDisabled}
            size={size}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            fullWidth
            type="date"
            label={`${field.label} (to)`}
            value={stringValue.split('|')[1] ?? ''}
            onChange={(event) => {
              const from = stringValue.split('|')[0] ?? ''
              onChange(`${from}|${event.target.value}`)
            }}
            onBlur={onBlur}
            disabled={isDisabled}
            size={size}
            slotProps={{
              inputLabel: { shrink: true },
              input: { endAdornment },
            }}
          />
        </Box>
      )
      break

    case 'image':
    case 'file':
      control = (
        <FileField
          kind={field.type}
          label={field.label}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={isDisabled}
          tooltip={field.tooltip}
        />
      )
      break

    default: {
      const inputType =
        field.type === 'password'
          ? 'password'
          : field.type === 'email'
            ? 'email'
            : field.type === 'number'
              ? 'number'
              : field.type === 'date'
                ? 'date'
                : 'text'

      control = (
        <TextField
          fullWidth
          id={field.name}
          name={field.name}
          label={field.label}
          type={inputType}
          value={field.type === 'date' ? stringValue.slice(0, 10) : stringValue}
          error={hasError}
          helperText={error}
          autoComplete={field.autoComplete}
          disabled={isDisabled}
          size={size}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          slotProps={{
            ...(field.type === 'number'
              ? {
                  htmlInput: {
                    min: field.validation?.min,
                    max: field.validation?.max,
                  },
                }
              : field.type === 'date'
                ? {
                    inputLabel: { shrink: true },
                  }
                : {}),
            ...(endAdornment ? { input: { endAdornment } } : {}),
          }}
        />
      )
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>{control}</Box>
      {field.deletable ? (
        <IconButton color="error" onClick={onDelete} disabled={isDisabled} aria-label="delete">
          <CloseIcon />
        </IconButton>
      ) : null}
    </Box>
  )
}
