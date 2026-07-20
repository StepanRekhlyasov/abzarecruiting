import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { DashboardPositionDto } from '@entities/dashboard'
import { positionDetailPath } from '@shared/config/routes'
import { formatDateTime } from '@shared/lib/date'

type DashboardPositionsTableProps = {
  title: string
  listHref?: string
  rows: DashboardPositionDto[]
  emptyMessage: string
  showResumesCount?: boolean
  showMessagesCount?: boolean
  canLinkDetail: boolean
}

export function DashboardPositionsTable({
  title,
  listHref,
  rows,
  emptyMessage,
  showResumesCount = false,
  showMessagesCount = false,
  canLinkDetail,
}: DashboardPositionsTableProps) {
  const { t } = useTranslation()
  const columnCount = 6 + (showResumesCount ? 1 : 0) + (showMessagesCount ? 1 : 0)

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 2,
          mb: 1.5,
        }}
      >
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {listHref ? (
          <Link component={RouterLink} to={listHref} underline="hover" variant="body2">
            {t('home.viewAll')}
          </Link>
        ) : null}
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('positions.columns.name')}</TableCell>
              <TableCell>{t('positions.columns.company')}</TableCell>
              <TableCell>{t('positions.columns.country')}</TableCell>
              <TableCell>{t('positions.columns.level')}</TableCell>
              <TableCell>{t('positions.columns.format')}</TableCell>
              {showResumesCount ? (
                <TableCell align="right">{t('positions.columns.resumesCount')}</TableCell>
              ) : null}
              {showMessagesCount ? (
                <TableCell align="right">{t('positions.columns.messagesCount')}</TableCell>
              ) : null}
              <TableCell>{t('positions.columns.createdAt')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover={canLinkDetail}>
                  <TableCell>
                    {canLinkDetail ? (
                      <Link
                        component={RouterLink}
                        to={positionDetailPath(row.id)}
                        underline="hover"
                        color="inherit"
                      >
                        {row.name}
                      </Link>
                    ) : (
                      row.name
                    )}
                  </TableCell>
                  <TableCell>{row.company || '—'}</TableCell>
                  <TableCell>{row.country || '—'}</TableCell>
                  <TableCell>{t(`positions.levels.${row.level}`, row.level)}</TableCell>
                  <TableCell>{t(`positions.formats.${row.format}`, row.format)}</TableCell>
                  {showResumesCount ? (
                    <TableCell align="right">{row.resumesCount}</TableCell>
                  ) : null}
                  {showMessagesCount ? (
                    <TableCell align="right">{row.messagesCount}</TableCell>
                  ) : null}
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
