import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { AbzaModal } from '@features/abza-modal'

type AbzaFilterModalProps<T> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: T
  onApply: (value: T) => void
  onReset: () => void
  title: string
  isLoading?: boolean
  applyLabel?: string
  cancelLabel?: string
  resetLabel?: string
  children: (draft: T, setDraft: Dispatch<SetStateAction<T>>) => ReactNode
}

export function AbzaFilterModal<T>({
  open,
  onOpenChange,
  value,
  onApply,
  onReset,
  title,
  isLoading = false,
  applyLabel,
  cancelLabel,
  resetLabel,
  children,
}: AbzaFilterModalProps<T>) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (open) {
      setDraft(value)
    }
  }, [open, value])

  return (
    <AbzaModal
      open={open}
      config={{
        title,
        submitLabel: applyLabel ?? t('common.filter.apply'),
        cancelLabel: cancelLabel ?? t('common.filter.cancel'),
      }}
      secondaryLabel={resetLabel ?? t('common.filter.reset')}
      onSecondary={onReset}
      onOpenChange={onOpenChange}
      onSubmit={() => onApply(draft)}
      isLoading={isLoading}
    >
      {children(draft, setDraft)}
    </AbzaModal>
  )
}
