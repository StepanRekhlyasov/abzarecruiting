import type { PropsWithChildren } from 'react'
import { withTheme } from './with-theme'
import { withI18n } from './with-i18n'

export function AppProviders({ children }: PropsWithChildren) {
  return withI18n({
    children: withTheme({ children }),
  })
}

export { withTheme, withI18n }
