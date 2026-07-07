import { useEffect } from 'react'
import { appStarted } from '@entities/user'
import { AppProviders } from './providers'
import { AppRouter } from './router'

export function App() {
  useEffect(() => {
    appStarted()
  }, [])

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
