import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { InputProvider } from '@features/attribute'
import type { ProfileAttributeDto } from '@shared/types'

export type AttributeSectionMode = 'default' | 'attrs'

export type AttributeSectionProps = {
  title: string
  mode: AttributeSectionMode
  attributes: ProfileAttributeDto[]
  draftValues: Record<number, string>
  onChange: (attributeId: number, value: string) => void
  onForceSave?: () => void
  emptyMessage?: string
}

export function AttributeSection({
  title,
  mode,
  attributes,
  draftValues,
  onChange,
  onForceSave,
  emptyMessage,
}: AttributeSectionProps) {
  return (
    <Box data-section-mode={mode} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5" component="h4">
        {title}
      </Typography>
      {attributes.length === 0 ? (
        emptyMessage ? (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        ) : null
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {attributes.map((attribute) => (
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
          ))}
        </Box>
      )}
    </Box>
  )
}
