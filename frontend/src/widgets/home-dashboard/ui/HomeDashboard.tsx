import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnit } from 'effector-react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { $session, isAdmin, isCandidate, isRecruiterOrAdmin } from '@entities/user'
import { fetchDashboard, type DashboardDto } from '@entities/dashboard'
import { AbzaError } from '@features/abza-error'
import { ROUTES } from '@shared/config/routes'
import { getErrorKey } from '@shared/lib/errors'
import { DashboardPositionsTable } from './DashboardPositionsTable'
import { StatsSection } from './StatsSection'
import { TagCloudSection } from './TagCloudSection'

export function HomeDashboard() {
  const { t } = useTranslation()
  const session = useUnit($session)
  const [data, setData] = useState<DashboardDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canLinkCvs = Boolean(session)
  const canLinkUsers = isRecruiterOrAdmin(session)
  const showPositionsTagCloud = isCandidate(session) || isAdmin(session)
  const showResumesTagCloud = isRecruiterOrAdmin(session)
  const showScopeLabels = isAdmin(session)

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setIsLoading(true)
      setError(null)

      try {
        const dashboard = await fetchDashboard({ signal: controller.signal })
        if (!controller.signal.aborted) {
          setData(dashboard)
        }
      } catch (loadError) {
        if (controller.signal.aborted) {
          return
        }

        setError(getErrorKey(loadError, 'error.dashboard.load'))
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    })()

    return () => controller.abort()
  }, [])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (error) {
    return <AbzaError error={error} />
  }

  if (!data) {
    return null
  }

  const positionsTagCloudTitle = showScopeLabels
    ? `${t('home.tagCloud.title')} (${t('home.tagCloud.positions')})`
    : t('home.tagCloud.title')

  const resumesTagCloudTitle = showScopeLabels
    ? `${t('home.tagCloud.title')} (${t('home.tagCloud.resumes')})`
    : t('home.tagCloud.title')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <StatsSection
        stats={data.stats}
        canLinkPositions
        canLinkCvs={canLinkCvs}
        canLinkUsers={canLinkUsers}
      />

      <DashboardPositionsTable
        title={t('home.latestPositions.title')}
        listHref={ROUTES.positions}
        rows={data.latestPositions}
        emptyMessage={t('home.latestPositions.empty')}
        showResumesCount={false}
        canLinkDetail
      />

      <DashboardPositionsTable
        title={t('home.popularPositions.title')}
        listHref={ROUTES.positions}
        rows={data.popularPositions}
        emptyMessage={t('home.popularPositions.empty')}
        showResumesCount
        canLinkDetail
      />

      <DashboardPositionsTable
        title={t('home.discussedPositions.title')}
        listHref={ROUTES.positions}
        rows={data.discussedPositions}
        emptyMessage={t('home.discussedPositions.empty')}
        showMessagesCount
        canLinkDetail
      />

      {showPositionsTagCloud ? (
        <TagCloudSection
          tags={data.positionsTagCloud}
          basePath={ROUTES.positions}
          title={positionsTagCloudTitle}
        />
      ) : null}

      {showResumesTagCloud ? (
        <TagCloudSection
          tags={data.resumesTagCloud}
          basePath={ROUTES.cvs}
          title={resumesTagCloudTitle}
        />
      ) : null}
    </Box>
  )
}
