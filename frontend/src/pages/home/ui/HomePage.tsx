import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { AppHeader } from '@features/app-header'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <>
      <AppHeader />
      <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          py: 6,
        }}
      >

        <Typography variant="h3" component="h1" gutterBottom>
          {t('home.title')}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('home.description')}
        </Typography>
      </Box>
      </Container>
    </>
  )
}
