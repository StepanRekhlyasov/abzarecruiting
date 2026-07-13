import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import type { ProjectDto } from '@entities/project'
import { formatDate } from '@shared/lib/date'

type ProjectsSectionProps = {
  projects: ProjectDto[]
  onAddClick: () => void
  onEditClick: (project: ProjectDto) => void
  disabled?: boolean
}

function formatPeriod(project: ProjectDto, presentLabel: string) {
  const start = formatDate(project.startAt)
  const end = project.endAt ? formatDate(project.endAt) : presentLabel
  return `${start} — ${end}`
}

export function ProjectsSection({
  projects,
  onAddClick,
  onEditClick,
  disabled = false,
}: ProjectsSectionProps) {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Button variant="contained" onClick={onAddClick} disabled={disabled} sx={{ boxShadow: 'none' }}>
          {t('profile.projects.add')}
        </Button>
      </Box>

      {projects.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('profile.projects.empty')}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {projects.map((project) => (
            <Box
              key={project.id}
              onClick={() => onEditClick(project)}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 1,
                }}
              >
                <Typography variant="h6" component="h3" sx={{ fontSize: '1.05rem' }}>
                  {project.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {formatPeriod(project, t('profile.projects.present'))}
                </Typography>
              </Box>

              {project.description ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {project.description}
                </Typography>
              ) : null}

              {project.tags.length > 0 ? (
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {project.tags.map((tag) => (
                    <Chip key={tag.id} size="small" label={tag.name} />
                  ))}
                </Stack>
              ) : null}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
