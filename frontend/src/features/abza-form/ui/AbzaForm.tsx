import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import { validateAbzaForm } from '../lib/validate'
import type { AbzaFieldConfig, AbzaFormConfig, AbzaFormValues } from '@shared/types'

type AbzaFormProps = {
  config: AbzaFormConfig
  onSubmit: (values: AbzaFormValues) => void | Promise<void>
  isLoading?: boolean
  serverError?: string | null
  formId?: string
  hideSubmitButton?: boolean
  initialValues?: AbzaFormValues
  resetKey?: string | number
  onValuesChange?: (values: AbzaFormValues) => void
}

function createInitialValues(fields: AbzaFieldConfig[], initialValues?: AbzaFormValues): AbzaFormValues {
  const defaults = Object.fromEntries(fields.map((field) => [field.name, '']))

  if (!initialValues) {
    return defaults
  }

  return { ...defaults, ...initialValues }
}

export function AbzaForm({
  config,
  onSubmit,
  isLoading = false,
  serverError,
  formId,
  hideSubmitButton = false,
  initialValues,
  resetKey,
  onValuesChange,
}: AbzaFormProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<AbzaFormValues>(() => createInitialValues(config.fields, initialValues))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setValues(createInitialValues(config.fields, initialValues))
    setErrors({})
    setTouched({})
  }, [resetKey])

  const validationMessages = {
    required: t('form.errors.required'),
    minLength: (min: number) => t('form.errors.minLength', { min }),
    maxLength: (max: number) => t('form.errors.maxLength', { max }),
    email: t('form.errors.email'),
    pattern: (key?: string) => (key ? t(key) : t('form.errors.pattern')),
  }

  const handleChange = (name: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value }

      onValuesChange?.(next)
      return next
    })

    if (touched[name]) {
      const field = config.fields.find((item) => item.name === name)
      if (field) {
        const nextErrors = validateAbzaForm([field], { ...values, [name]: value }, validationMessages)
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateAbzaForm(config.fields, values, validationMessages)
    setErrors(nextErrors)
    setTouched(Object.fromEntries(config.fields.map((field) => [field.name, true])))

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit(values)
  }

  const renderField = (field: AbzaFieldConfig) => {
    const error = touched[field.name] ? errors[field.name] : undefined
    const hasError = Boolean(error)

    if (field.type === 'select') {
      return (
        <FormControl key={field.name} fullWidth error={hasError}>
          <InputLabel id={`${field.name}-label`}>{field.label}</InputLabel>
          <Select
            labelId={`${field.name}-label`}
            id={field.name}
            name={field.name}
            value={values[field.name] ?? ''}
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

    const inputType = field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : 'text'

    return (
      <TextField
        key={field.name}
        fullWidth
        id={field.name}
        name={field.name}
        label={field.label}
        type={inputType}
        value={values[field.name] ?? ''}
        error={hasError}
        helperText={error}
        autoComplete={field.autoComplete}
        disabled={field.disabled || isLoading}
        onChange={(event) => handleChange(field.name, event.target.value)}
        onBlur={() => handleBlur(field.name)}
      />
    )
  }

  return (
    <Box component="form" id={formId} onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {serverError && <Alert severity="error">{serverError}</Alert>}

      {config.fields.map(renderField)}

      {!hideSubmitButton && (
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {config.submitLabel}
        </Button>
      )}
    </Box>
  )
}
