import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { InputProvider } from '@features/attribute'
import type { AbzaSelectOption, AttributeDraftValue, ProfileAttributeDto } from '@shared/types'
import { AsyncEntityTags } from '@shared/ui/inputs'

export type AttributeSectionMode = 'default' | 'attrs'

export type AttributeSectionProps = {
  mode: AttributeSectionMode
  attributes: ProfileAttributeDto[]
  draftValues: Record<number, AttributeDraftValue>
  onChange: (attributeId: number, value: AttributeDraftValue) => void
  onForceSave?: () => void
  emptyMessage?: string
  loadAttributeOptions?: (search: string, signal?: AbortSignal) => Promise<AbzaSelectOption[]>
  onAddAttributes?: (attributeIds: number[]) => Promise<void>
  onRemoveAttribute?: (attributeId: number) => Promise<void>
  isAdding?: boolean
}

export function AttributeSection({
  mode,
  attributes,
  draftValues,
  onChange,
  onForceSave,
  emptyMessage,
  loadAttributeOptions,
  onAddAttributes,
  onRemoveAttribute,
  isAdding = false,
}: AttributeSectionProps) {
  const { t } = useTranslation()
  const [selectedAttributes, setSelectedAttributes] = useState<AbzaSelectOption[]>([])

  const showAddControls = mode === 'attrs' && Boolean(loadAttributeOptions) && Boolean(onAddAttributes)

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
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            alignItems: { xs: 'stretch', sm: 'flex-start' },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AsyncEntityTags
              label={t('profile.addedAttributes.select')}
              value={selectedAttributes}
              onChange={setSelectedAttributes}
              loadOptions={loadAttributeOptions!}
              disabled={isAdding}
            />
          </Box>
          <Button
            variant="contained"
            onClick={() => void handleAdd()}
            disabled={isAdding || selectedAttributes.length === 0}
            sx={{ boxShadow: 'none', alignSelf: { sm: 'center' }, whiteSpace: 'nowrap' }}
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
        attributes.map((attribute) => (
          <InputProvider
            key={attribute.id}
            attribute={attribute}
            value={draftValues[attribute.id] ?? ''}
            onChange={(value) => onChange(attribute.id, value)}
            onBlur={onForceSave}
            editable={!isAdding}
            deletable={mode === 'attrs' && Boolean(onRemoveAttribute)}
            onDelete={
              onRemoveAttribute
                ? () => {
                    void onRemoveAttribute(attribute.id)
                  }
                : undefined
            }
            tooltip={attribute.description}
          />
        ))
      )}
    </Box>
  )
}
