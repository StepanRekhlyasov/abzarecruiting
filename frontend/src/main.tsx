import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { App } from '@app'
import { appStarted } from '@entities/user'
import '@app/styles/global.css'

appStarted()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
