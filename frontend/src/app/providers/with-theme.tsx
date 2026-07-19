import { useMemo, type PropsWithChildren } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeModeProvider, useThemeMode } from '@shared/config/theme'

function MuiThemeBridge({ children }: PropsWithChildren) {
  const { mode } = useThemeMode()

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#1976d2',
          },
        },
      }),
    [mode],
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

export function withTheme({ children }: PropsWithChildren) {
  return (
    <ThemeModeProvider>
      <MuiThemeBridge>{children}</MuiThemeBridge>
    </ThemeModeProvider>
  )
}
