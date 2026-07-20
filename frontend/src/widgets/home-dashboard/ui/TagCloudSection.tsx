import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import type { DashboardTagDto } from '@entities/dashboard'
import { withTagIdsQuery } from '@shared/config/routes'

type TagCloudSectionProps = {
  tags: DashboardTagDto[]
  basePath: string
  title: string
}

function chipFontSize(count: number, minCount: number, maxCount: number): number {
  if (maxCount <= minCount) {
    return 0.875
  }

  const ratio = (count - minCount) / (maxCount - minCount)
  return 0.75 + ratio * 0.75
}

export function TagCloudSection({ tags, basePath, title }: TagCloudSectionProps) {
  const { t } = useTranslation()

  const { minCount, maxCount } = useMemo(() => {
    if (tags.length === 0) {
      return { minCount: 0, maxCount: 0 }
    }

    const counts = tags.map((tag) => tag.count)
    return {
      minCount: Math.min(...counts),
      maxCount: Math.max(...counts),
    }
  }, [tags])

  return (
    <Box>
      <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>

      {tags.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('home.tagCloud.empty')}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {tags.map((tag) => {
            const fontSize = `${chipFontSize(tag.count, minCount, maxCount)}rem`

            return (
              <Chip
                key={tag.id}
                component={RouterLink}
                to={withTagIdsQuery(basePath, tag.id)}
                clickable
                label={`${tag.name} (${tag.count})`}
                variant="outlined"
                sx={{ fontSize, height: 'auto', py: 0.5 }}
              />
            )
          })}
        </Box>
      )}
    </Box>
  )
}
