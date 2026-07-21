import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import type {
  AbzaSelectOption,
  AsyncEntityLoadOptions,
  AttributeDraftValue,
  ProfileAttributeDto,
} from '@shared/types'
import { groupAttributesByCategory } from '@shared/types'
import { AsyncEntityTags } from '@shared/ui/inputs'
import { AttributeCategoryForm } from './AttributeCategoryForm'

export type AttributeSectionMode = 'default' | 'attrs'

export type AttributeSectionProps = {
  mode: AttributeSectionMode
  attributes: ProfileAttributeDto[]
  onChange: (attributeId: number, value: AttributeDraftValue) => void
  emptyMessage?: string
  loadAttributeOptions?: AsyncEntityLoadOptions
  onAddAttributes?: (attributeIds: number[]) => Promise<void>
  onRemoveAttribute?: (attributeId: number) => Promise<void>
  isAdding?: boolean
  editable?: boolean
  highlightEmptyFields?: boolean
  fieldErrors?: Record<string, string>
}

export function AttributeSection({
  mode,
  attributes,
  onChange,
  emptyMessage,
  loadAttributeOptions,
  onAddAttributes,
  onRemoveAttribute,
  isAdding = false,
  editable = true,
  highlightEmptyFields = false,
  fieldErrors,
}: AttributeSectionProps) {
  const { t } = useTranslation()
  const [selectedAttributes, setSelectedAttributes] = useState<AbzaSelectOption[]>([])

  const showAddControls = mode === 'attrs' && Boolean(loadAttributeOptions) && Boolean(onAddAttributes)
  const canEdit = editable && !isAdding
  const canDelete = mode === 'attrs' && editable && Boolean(onRemoveAttribute)

  const groupedAttributes = useMemo(() => groupAttributesByCategory(attributes), [attributes])

  const handleAdd = async () => {
    if (!onAddAttributes || selectedAttributes.length === 0) {
      return
    }

    const ids = selectedAttributes
      .map((option) => Number(option.value))
      .filter((id) => Number.isFinite(id))

    await onAddAttributes(ids)
    setSelectedAttributes([])
  }

  return (
    <Box data-section-mode={mode} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {showAddControls ? (
        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 2, alignItems: 'stretch' }}>
          <AsyncEntityTags
            label={t('profile.addedAttributes.select')}
            value={selectedAttributes}
            onChange={setSelectedAttributes}
            loadOptions={loadAttributeOptions!}
            disabled={isAdding}
          />
          <Button
            variant="contained"
            onClick={() => void handleAdd()}
            disabled={isAdding || selectedAttributes.length === 0}
          >
            {t('profile.addedAttributes.add')}
          </Button>
        </Box>
      ) : null}

      {attributes.length === 0 ? (
        emptyMessage ? (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        ) : null
      ) : (
        groupedAttributes.map(({ category, attributes: categoryAttributes }) => (
          <AttributeCategoryForm
            key={category}
            category={category}
            categoryAttributes={categoryAttributes}
            canEdit={canEdit}
            canDelete={canDelete}
            isAdding={isAdding}
            highlightEmptyFields={highlightEmptyFields}
            fieldErrors={fieldErrors}
            onChange={onChange}
            onRemoveAttribute={onRemoveAttribute}
          />
        ))
      )}
    </Box>
  )
}
