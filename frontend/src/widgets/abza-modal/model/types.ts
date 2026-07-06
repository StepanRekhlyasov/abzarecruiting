import type { ReactNode } from 'react'

export type AbzaModalConfig = {
  title: string
  submitLabel: string
  cancelLabel: string
}

export type AbzaModalProps = {
  open: boolean
  config: AbzaModalConfig
  onClose: () => void
  onSubmit: () => void | Promise<void>
  children: ReactNode
  isSubmitting?: boolean
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}
