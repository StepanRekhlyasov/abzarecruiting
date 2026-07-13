import type { AbzaFormValues } from '@shared/types'
import type { ProjectDto } from '@entities/project'

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

export function projectToFormValues(project: ProjectDto): AbzaFormValues {
  return {
    name: project.name,
    description: project.description,
    startAt: toDateInputValue(project.startAt),
    endAt: toDateInputValue(project.endAt),
    tags: project.tags.map((tag) => ({
      value: String(tag.id),
      label: tag.name,
    })),
  }
}
