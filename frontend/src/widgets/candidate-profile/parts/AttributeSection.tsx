import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { InputProvider } from '@features/attribute'
import type { AttributeDraftValue, ProfileAttributeDto } from '@shared/types'

export type AttributeSectionMode = 'default' | 'attrs'

export type AttributeSectionProps = {
  mode: AttributeSectionMode
  attributes: ProfileAttributeDto[]
  draftValues: Record<number, AttributeDraftValue>
  onChange: (attributeId: number, value: AttributeDraftValue) => void
  onForceSave?: () => void
  emptyMessage?: string
}

export function AttributeSection({
  mode,
  attributes,
  draftValues,
  onChange,
  onForceSave,
  emptyMessage,
}: AttributeSectionProps) {
  return (
    <Box data-section-mode={mode} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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
            editable
            deletable={false}
            tooltip={attribute.description}
          />
        ))
      )}
    </Box>
  )
}
