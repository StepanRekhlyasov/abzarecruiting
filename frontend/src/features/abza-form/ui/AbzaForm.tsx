import { type RefObject, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { AbzaError } from '@features/abza-error'
import { parseApiError } from '@shared/lib/errors'
import type { AbzaFieldConfig, AbzaFormConfig, AbzaFormValue, AbzaFormValues } from '@shared/types'
import { validateAbzaForm } from '../lib/validate'
import { isFieldVisible } from '../lib/fieldVisibility'
import { AbzaField } from './AbzaField'

type AbzaFormProps = {
  config: AbzaFormConfig
  onSubmit?: (values: AbzaFormValues) => void | Promise<void>
  isLoading?: boolean
  formRef?: RefObject<HTMLFormElement | null>
  hideSubmitButton?: boolean
  initialValues?: AbzaFormValues
  values?: AbzaFormValues
  onFieldChange?: (name: string, value: AbzaFormValue) => void
  onFieldBlur?: (name: string) => void
  onFieldDelete?: (name: string) => void
  highlightEmptyFields?: boolean
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
  values: controlledValues,
  onFieldChange,
  onFieldBlur,
  onFieldDelete,
  highlightEmptyFields = false,
}: AbzaFormProps) {
  const { t } = useTranslation()
  const isControlled = controlledValues !== undefined
  const [internalValues, setInternalValues] = useState<AbzaFormValues>(() =>
    createInitialValues(config.fields, initialValues),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const values = isControlled ? controlledValues : internalValues

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

  const setValue = (name: string, value: AbzaFormValue) => {
    let next: AbzaFormValues = { ...values, [name]: value }

    if (name === 'valueType' && value !== 'select') {
      for (const field of config.fields) {
        if (field.type === 'optionTags') {
          next = { ...next, [field.name]: [] }
        }
      }
    }

    if (!isControlled) {
      setInternalValues(next)
    }

    onFieldChange?.(name, value)

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
    onFieldBlur?.(name)
  }

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!onSubmit) {
      return
    }

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

  return (
    <Box
      component="form"
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <AbzaError error={serverError} onClose={() => setServerError(null)} />

      {config.fields.map((field) => {
        if (!isFieldVisible(field, values)) {
          return null
        }

        const error = (highlightEmptyFields && values[field.name] === '') || (touched[field.name] ? errors[field.name] : undefined)

        return (
          <AbzaField
            key={field.name}
            field={field}
            value={values[field.name] ?? ''}
            error={error}
            disabled={isLoading}
            onChange={(value) => setValue(field.name, value)}
            onBlur={() => handleBlur(field.name)}
            onDelete={onFieldDelete ? () => onFieldDelete(field.name) : undefined}
          />
        )
      })}

      {!hideSubmitButton && config.submitLabel ? (
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {config.submitLabel}
        </Button>
      ) : null}
    </Box>
  )
}
