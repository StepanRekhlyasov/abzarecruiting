import { useEffect } from 'react'
import { appStarted } from '../model/session'

export function SessionInitializer() {
  useEffect(() => {
    appStarted()
  }, [])

  return null
}
