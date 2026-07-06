import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { AppHeader } from '@widgets/app-header'
import { AttributesTableWithNotifications } from '@widgets/attributes-table'

export function AttributesPage() {
  const { t } = useTranslation()

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('attributes.title')}
          </Typography>

          <AttributesTableWithNotifications />
        </Box>
      </Container>
    </>
  )
}
