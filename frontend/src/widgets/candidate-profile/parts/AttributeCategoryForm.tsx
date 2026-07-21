import { memo, useCallback, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import {
  AbzaForm,
  attributesToFormConfig,
  attributesToFormValues,
} from '@features/abza-form'
import type { AbzaFormValue, AttributeDraftValue, ProfileAttributeDto } from '@shared/types'

type AttributeCategoryFormProps = {
  category: string
  categoryAttributes: ProfileAttributeDto[]
  canEdit: boolean
  canDelete: boolean
  isAdding: boolean
  highlightEmptyFields: boolean
  fieldErrors?: Record<string, string>
  onChange: (attributeId: number, value: AttributeDraftValue) => void
  onRemoveAttribute?: (attributeId: number) => Promise<void>
}

export const AttributeCategoryForm = memo(function AttributeCategoryForm({
  category,
  categoryAttributes,
  canEdit,
  canDelete,
  isAdding,
  highlightEmptyFields,
  fieldErrors,
  onChange,
  onRemoveAttribute,
}: AttributeCategoryFormProps) {
  const { t } = useTranslation()

  const formKey = useMemo(
    () => categoryAttributes.map((attribute) => `${attribute.id}:${attribute.version}`).join('|'),
    [categoryAttributes],
  )

  const formConfig = useMemo(
    () =>
      attributesToFormConfig(categoryAttributes, {
        disabled: !canEdit,
        deletable: canDelete,
        size: 'small',
      }),
    [canDelete, canEdit, categoryAttributes],
  )

  const initialValues = useMemo(
    () => attributesToFormValues(categoryAttributes),
    [categoryAttributes],
  )

  const handleFieldChange = useCallback(
    (name: string, value: AbzaFormValue) => {
      onChange(Number(name), value as AttributeDraftValue)
    },
    [onChange],
  )

  const handleFieldDelete = useCallback(
    (name: string) => {
      if (onRemoveAttribute) {
        void onRemoveAttribute(Number(name))
      }
    },
    [onRemoveAttribute],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="h6" component="h3">
        {t(`attributes.categories.${category}`, category)}
      </Typography>
      <AbzaForm
        key={formKey}
        config={formConfig}
        initialValues={initialValues}
        hideSubmitButton
        isLoading={isAdding}
        onFieldChange={handleFieldChange}
        onFieldDelete={onRemoveAttribute ? handleFieldDelete : undefined}
        highlightEmptyFields={highlightEmptyFields}
        externalErrors={fieldErrors}
      />
    </Box>
  )
})
