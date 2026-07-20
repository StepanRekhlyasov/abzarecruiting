import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { DashboardStatsDto } from '@entities/dashboard'
import { ROUTES } from '@shared/config/routes'

type StatsSectionProps = {
  stats: DashboardStatsDto
  canLinkPositions: boolean
  canLinkCvs: boolean
  canLinkUsers: boolean
}

type StatItem = {
  key: string
  label: string
  value: number
  href?: string
}

export function StatsSection({
  stats,
  canLinkPositions,
  canLinkCvs,
  canLinkUsers,
}: StatsSectionProps) {
  const { t } = useTranslation()

  const items: StatItem[] = [
    {
      key: 'cvsLast24Hours',
      label: t('home.stats.cvsLast24Hours'),
      value: stats.cvsLast24Hours,
      href: canLinkCvs ? ROUTES.cvs : undefined,
    },
    {
      key: 'totalPositions',
      label: t('home.stats.totalPositions'),
      value: stats.totalPositions,
      href: canLinkPositions ? ROUTES.positions : undefined,
    },
    {
      key: 'totalCandidates',
      label: t('home.stats.totalCandidates'),
      value: stats.totalCandidates,
      href: canLinkUsers ? ROUTES.users : undefined,
    },
    {
      key: 'totalRecruiters',
      label: t('home.stats.totalRecruiters'),
      value: stats.totalRecruiters,
      href: canLinkUsers ? ROUTES.users : undefined,
    },
    {
      key: 'totalSubmittedCvs',
      label: t('home.stats.totalSubmittedCvs'),
      value: stats.totalSubmittedCvs,
      href: canLinkCvs ? ROUTES.cvs : undefined,
    },
  ]

  return (
    <Box>
      <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
        {t('home.stats.title')}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
        }}
      >
        {items.map((item) => (
          <Paper key={item.key} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, whiteSpace: 'nowrap' }}>
              {item.label}
            </Typography>
            {item.href ? (
              <Link
                component={RouterLink}
                to={item.href}
                underline="hover"
                color="inherit"
                variant="h5"
                sx={{ fontWeight: 600 }}
              >
                {item.value}
              </Link>
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {item.value}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>
    </Box>
  )
}
