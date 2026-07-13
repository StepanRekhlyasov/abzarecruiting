import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { AppHeader } from '@features/app-header'
import { PositionsTable } from '@widgets/positions-table'

export function PositionsPage() {
  const { t } = useTranslation()

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('positions.title')}
          </Typography>

          <PositionsTable />
        </Box>
      </Container>
    </>
  )
}
