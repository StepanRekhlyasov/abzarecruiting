import type { ReactNode, Dispatch, SetStateAction } from 'react'
import Stack from '@mui/material/Stack'
import { TagsField } from '@entities/tag'
import type { AbzaSelectOption } from '@shared/types'
import { AbzaFilterModal } from './AbzaFilterModal'

type TagsFilterValue = {
  tags: AbzaSelectOption[]
}

type TagsFilterModalProps<T extends TagsFilterValue> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: T
  onApply: (value: T) => void
  onReset: () => void
  title: string
  tagsLabel: string
  isLoading?: boolean
  extraFields?: (draft: T, setDraft: Dispatch<SetStateAction<T>>) => ReactNode
}

export function TagsFilterModal<T extends TagsFilterValue>({
  open,
  onOpenChange,
  value,
  onApply,
  onReset,
  title,
  tagsLabel,
  isLoading = false,
  extraFields,
}: TagsFilterModalProps<T>) {
  return (
    <AbzaFilterModal
      open={open}
      onOpenChange={onOpenChange}
      value={value}
      onApply={onApply}
      onReset={onReset}
      title={title}
      isLoading={isLoading}
    >
      {(draft, setDraft) => (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TagsField
            label={tagsLabel}
            value={draft.tags}
            onChange={(tags) => setDraft((current) => ({ ...current, tags }))}
            allowCreate={false}
            size="small"
          />
          {extraFields?.(draft, setDraft)}
        </Stack>
      )}
    </AbzaFilterModal>
  )
}
