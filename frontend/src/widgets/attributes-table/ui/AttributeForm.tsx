import { type RefObject, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { AbzaForm, createAbzaValidationMessages, validateAbzaForm } from '@features/abza-form'
import { createAttributeFormConfig } from '@shared/config/forms'
import { i18n } from '@shared/config/i18n'
import {
  filterValidationsForValueType,
  getAllowedValidationTypes,
  getValidationValueInputType,
  hasAvailableValidations,
  type AttributeValidationRequest,
} from '@shared/lib/attributes/attributeValidation'
import type { AbzaFormValue, AbzaFormValues } from '@shared/types'

type ValidationItem = AttributeValidationRequest & { key: string }

type AttributeFormProps = {
  formRef: RefObject<HTMLFormElement | null>
  initialValues?: AbzaFormValues
  initialValidations?: AttributeValidationRequest[]
  isLoading?: boolean
  onSubmit: (values: AbzaFormValues, validations: AttributeValidationRequest[]) => Promise<void>
}

function createValidationKey() {
  return `validation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function toValidationItems(validations: AttributeValidationRequest[] = []): ValidationItem[] {
  return validations.map((item) => ({
    key: createValidationKey(),
    validationType: item.validationType,
    validationValue: item.validationValue,
  }))
}

function toValidationRequest(items: ValidationItem[]): AttributeValidationRequest[] {
  return items
    .map(({ validationType, validationValue }) => ({
      validationType: validationType.trim(),
      validationValue: validationValue.trim(),
    }))
    .filter((item) => item.validationType && item.validationValue)
}

export function AttributeForm({
  formRef,
  initialValues,
  initialValidations = [],
  isLoading = false,
  onSubmit,
}: AttributeFormProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('general')
  const [formValues, setFormValues] = useState<AbzaFormValues>(() => initialValues ?? {})
  const [validationItems, setValidationItems] = useState<ValidationItem[]>(() =>
    toValidationItems(initialValidations),
  )

  const formConfig = useMemo(() => createAttributeFormConfig(t), [i18n.language])

  const valueType = typeof formValues.valueType === 'string' ? formValues.valueType : ''
  const allowedValidationTypes = useMemo(() => getAllowedValidationTypes(valueType), [valueType])
  const validationTabDisabled = !hasAvailableValidations(valueType)

  const usedValidationTypes = new Set(validationItems.map((item) => item.validationType).filter(Boolean))

  const handleFieldChange = (name: string, value: AbzaFormValue) => {
    setFormValues((current) => {
      const next = { ...current, [name]: value }

      if (name === 'valueType' && typeof value === 'string') {
        const filtered = filterValidationsForValueType(toValidationRequest(validationItems), value)
        setValidationItems(toValidationItems(filtered))

        if (!hasAvailableValidations(value)) {
          setTab('general')
        }
      }

      return next
    })
  }

  const handleAddValidation = () => {
    const nextType = allowedValidationTypes.find((type) => !usedValidationTypes.has(type))
    if (!nextType) {
      return
    }

    setValidationItems((current) => [
      ...current,
      { key: createValidationKey(), validationType: nextType, validationValue: '' },
    ])
  }

  const handleValidationTypeChange = (key: string, validationType: string) => {
    setValidationItems((current) =>
      current.map((item) => (item.key === key ? { ...item, validationType, validationValue: '' } : item)),
    )
  }

  const handleValidationValueChange = (key: string, validationValue: string) => {
    setValidationItems((current) =>
      current.map((item) => (item.key === key ? { ...item, validationValue } : item)),
    )
  }

  const handleRemoveValidation = (key: string) => {
    setValidationItems((current) => current.filter((item) => item.key !== key))
  }

  const handleSubmit = async (values: AbzaFormValues) => {
    const validationMessages = createAbzaValidationMessages(t)
    const generalErrors = validateAbzaForm(formConfig.fields, values, validationMessages)

    if (Object.keys(generalErrors).length > 0) {
      setTab('general')
      return
    }

    setFormValues(values)
    await onSubmit(values, toValidationRequest(validationItems))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Tabs
        value={tab}
        onChange={(_, nextTab: string) => setTab(nextTab)}
        variant="fullWidth"
      >
        <Tab value="general" label={t('attributes.tabs.general')} />
        <Tab value="validation" label={t('attributes.tabs.validation')} disabled={validationTabDisabled} />
      </Tabs>

      {tab === 'general' ? (
        <AbzaForm
          formRef={formRef}
          hideSubmitButton
          config={formConfig}
          values={formValues}
          initialValues={initialValues}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      ) : (
        <Box
          component="form"
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit(formValues)
          }}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {validationItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('attributes.validation.empty')}
            </Typography>
          ) : (
            validationItems.map((item) => {
              const availableTypes = allowedValidationTypes.filter(
                (type) => type === item.validationType || !usedValidationTypes.has(type),
              )

              return (
                <Box key={item.key} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
                    <InputLabel>{t('attributes.validation.type')}</InputLabel>
                    <Select
                      label={t('attributes.validation.type')}
                      value={item.validationType}
                      onChange={(event) => handleValidationTypeChange(item.key, event.target.value)}
                      disabled={isLoading}
                    >
                      {availableTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {t(`attributes.validation.types.${type}`)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label={t('attributes.validation.value')}
                    type={getValidationValueInputType(item.validationType)}
                    value={item.validationValue}
                    onChange={(event) => handleValidationValueChange(item.key, event.target.value)}
                    size="small"
                    disabled={isLoading}
                    sx={{ flex: 1 }}
                  />

                  <IconButton
                    aria-label={t('attributes.validation.remove')}
                    onClick={() => handleRemoveValidation(item.key)}
                    disabled={isLoading}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              )
            })
          )}

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddValidation}
            disabled={isLoading || usedValidationTypes.size >= allowedValidationTypes.length}
          >
            {t('attributes.validation.add')}
          </Button>
        </Box>
      )}
    </Box>
  )
}
