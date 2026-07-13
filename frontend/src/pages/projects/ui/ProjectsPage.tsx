import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { AppHeader } from '@features/app-header'
import { ProjectsTable } from '@widgets/projects-table'

export function ProjectsPage() {
  const { t } = useTranslation()

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('projects.title')}
          </Typography>

          <ProjectsTable />
        </Box>
      </Container>
    </>
  )
}
