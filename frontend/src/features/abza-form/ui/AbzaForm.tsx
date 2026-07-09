import { type RefObject, useState } from 'react'
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
import { OptionTags } from '@shared/ui/inputs'
import { resolveErrorMessage } from '@shared/lib/errors'
import { validateAbzaForm } from '../lib/validate'
import { getStringArrayValue, getStringValue, isFieldVisible } from '../lib/fieldVisibility'
import type { AbzaFieldConfig, AbzaFormConfig, AbzaFormValues } from '@shared/types'

type AbzaFormProps = {
  config: AbzaFormConfig
  onSubmit: (values: AbzaFormValues) => void | Promise<void>
  isLoading?: boolean
  serverError?: string | null
  formRef?: RefObject<HTMLFormElement | null>
  hideSubmitButton?: boolean
  initialValues?: AbzaFormValues
}

function createInitialValues(fields: AbzaFieldConfig[], initialValues?: AbzaFormValues): AbzaFormValues {
  const defaults = Object.fromEntries(
    fields.map((field) => [field.name, field.type === 'optionTags' ? [] : '']),
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
  serverError,
  formRef,
  hideSubmitButton = false,
  initialValues,
}: AbzaFormProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<AbzaFormValues>(() => createInitialValues(config.fields, initialValues))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const resolvedServerError = resolveErrorMessage(serverError)

  const validationMessages = {
    required: t('form.errors.required'),
    minLength: (min: number) => t('form.errors.minLength', { min }),
    maxLength: (max: number) => t('form.errors.maxLength', { max }),
    email: t('form.errors.email'),
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

    await onSubmit(values)
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

    const inputType = field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : 'text'

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
      />
    )
  }

  return (
    <Box component="form" ref={formRef} onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {resolvedServerError && <Alert severity="error">{resolvedServerError}</Alert>}

      {config.fields.map(renderField)}

      {!hideSubmitButton && (
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {config.submitLabel}
        </Button>
      )}
    </Box>
  )
}
