import { type MouseEvent, type RefObject, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { AbzaError } from '@features/abza-error'
import { parseApiError } from '@shared/lib/errors'
import { AsyncEntitySelect, AsyncEntityTags, OptionTags } from '@shared/ui/inputs'
import { validateAbzaForm } from '../lib/validate'
import {
  getEntityOptionValue,
  getEntityOptionsValue,
  getStringArrayValue,
  getStringValue,
  isFieldVisible,
} from '../lib/fieldVisibility'
import type { AbzaFieldConfig, AbzaFormConfig, AbzaFormValues, AbzaSelectOption } from '@shared/types'

type AbzaFormProps = {
  config: AbzaFormConfig
  onSubmit: (values: AbzaFormValues) => void | Promise<void>
  isLoading?: boolean
  formRef?: RefObject<HTMLFormElement | null>
  hideSubmitButton?: boolean
  initialValues?: AbzaFormValues
}

function FieldTooltip({ tooltip }: { tooltip: string }) {
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

function createInitialValues(fields: AbzaFieldConfig[], initialValues?: AbzaFormValues): AbzaFormValues {
  const defaults = Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.type === 'optionTags' || field.type === 'asyncEntityTags'
        ? []
        : field.type === 'asyncEntitySelect'
          ? null
          : '',
    ]),
  ) as AbzaFormValues

  if (!initialValues) {
    return defaults
  }

  return { ...defaults, ...initialValues }
}

export function AbzaForm({
  config,
  onSubmit,
  isLoading = false,
  formRef,
  hideSubmitButton = false,
  initialValues,
}: AbzaFormProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<AbzaFormValues>(() => createInitialValues(config.fields, initialValues))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const validationMessages = {
    required: t('form.errors.required'),
    minLength: (min: number) => t('form.errors.minLength', { min }),
    maxLength: (max: number) => t('form.errors.maxLength', { max }),
    min: (min: number) => t('form.errors.min', { min }),
    max: (max: number) => t('form.errors.max', { max }),
    email: t('form.errors.email'),
    number: t('form.errors.number'),
    pattern: (key?: string) => (key ? t(key) : t('form.errors.pattern')),
  }

  const handleChange = (name: string, value: string) => {
    let next: AbzaFormValues = { ...values, [name]: value }

    if (name === 'valueType' && value !== 'select') {
      for (const field of config.fields) {
        if (field.type === 'optionTags') {
          next = { ...next, [field.name]: [] }
        }
      }
    }

    setValues(next)

    if (touched[name]) {
      const field = config.fields.find((item) => item.name === name)
      if (field) {
        const nextErrors = validateAbzaForm([field], next, validationMessages)
        setErrors((prev) => ({ ...prev, [name]: nextErrors[name] ?? '' }))
      }
    }
  }

  const handleOptionsChange = (name: string, options: string[]) => {
    const next = { ...values, [name]: options }
    setValues(next)

    if (touched[name]) {
      const field = config.fields.find((item) => item.name === name)
      if (field) {
        const nextErrors = validateAbzaForm([field], next, validationMessages)
        setErrors((prev) => ({ ...prev, [name]: nextErrors[name] ?? '' }))
      }
    }
  }

  const handleEntityOptionsChange = (name: string, options: AbzaSelectOption[]) => {
    const next = { ...values, [name]: options }
    setValues(next)

    if (touched[name]) {
      const field = config.fields.find((item) => item.name === name)
      if (field) {
        const nextErrors = validateAbzaForm([field], next, validationMessages)
        setErrors((prev) => ({ ...prev, [name]: nextErrors[name] ?? '' }))
      }
    }
  }

  const handleEntityOptionChange = (name: string, option: AbzaSelectOption | null) => {
    const next = { ...values, [name]: option }
    setValues(next)

    if (touched[name]) {
      const field = config.fields.find((item) => item.name === name)
      if (field) {
        const nextErrors = validateAbzaForm([field], next, validationMessages)
        setErrors((prev) => ({ ...prev, [name]: nextErrors[name] ?? '' }))
      }
    }
  }

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    const field = config.fields.find((item) => item.name === name)
    if (field) {
      const nextErrors = validateAbzaForm([field], values, validationMessages)
      setErrors((prev) => ({ ...prev, [name]: nextErrors[name] ?? '' }))
    }
  }

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateAbzaForm(config.fields, values, validationMessages)
    setErrors(nextErrors)
    setTouched(Object.fromEntries(config.fields.map((field) => [field.name, true])))

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setServerError(null)

    try {
      await onSubmit(values)
    } catch (error) {
      setServerError(parseApiError(error))
    }
  }

  const renderField = (field: AbzaFieldConfig) => {
    if (!isFieldVisible(field, values)) {
      return null
    }

    const error = touched[field.name] ? errors[field.name] : undefined
    const hasError = Boolean(error)

    if (field.type === 'optionTags') {
      return (
        <OptionTags
          key={field.name}
          label={field.label}
          options={getStringArrayValue(values, field.name)}
          onChange={(options) => handleOptionsChange(field.name, options)}
          disabled={field.disabled || isLoading}
        />
      )
    }

    if (field.type === 'asyncEntityTags') {
      return (
        <AsyncEntityTags
          key={field.name}
          label={field.label}
          value={getEntityOptionsValue(values, field.name)}
          onChange={(options) => handleEntityOptionsChange(field.name, options)}
          loadOptions={field.loadOptions ?? (async () => [])}
          allowCreate={field.allowCreateOptions}
          disabled={field.disabled || isLoading}
          error={hasError}
          helperText={error}
        />
      )
    }

    if (field.type === 'asyncEntitySelect') {
      return (
        <AsyncEntitySelect
          key={field.name}
          label={field.label}
          value={getEntityOptionValue(values, field.name)}
          onChange={(option) => handleEntityOptionChange(field.name, option)}
          loadOptions={field.loadOptions ?? (async () => [])}
          disabled={field.disabled || isLoading}
          error={hasError}
          helperText={error}
        />
      )
    }

    if (field.type === 'select') {
      return (
        <FormControl key={field.name} fullWidth error={hasError}>
          <InputLabel id={`${field.name}-label`}>{field.label}</InputLabel>
          <Select
            labelId={`${field.name}-label`}
            id={field.name}
            name={field.name}
            value={getStringValue(values, field.name)}
            label={field.label}
            disabled={field.disabled || isLoading}
            onChange={(event) => handleChange(field.name, event.target.value)}
            onBlur={() => handleBlur(field.name)}
          >
            {(field.options ?? []).map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {hasError && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      )
    }

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

    const endAdornment = field.tooltip ? (
      <InputAdornment position="end">
        <FieldTooltip tooltip={field.tooltip} />
      </InputAdornment>
    ) : undefined

    return (
      <TextField
        key={field.name}
        fullWidth
        id={field.name}
        name={field.name}
        label={field.label}
        type={inputType}
        value={getStringValue(values, field.name)}
        error={hasError}
        helperText={error}
        autoComplete={field.autoComplete}
        disabled={field.disabled || isLoading}
        onChange={(event) => handleChange(field.name, event.target.value)}
        onBlur={() => handleBlur(field.name)}
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

  return (
    <Box component="form" ref={formRef} onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <AbzaError error={serverError} onClose={() => setServerError(null)} />

      {config.fields.map(renderField)}

      {!hideSubmitButton && (
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {config.submitLabel}
        </Button>
      )}
    </Box>
  )
}
