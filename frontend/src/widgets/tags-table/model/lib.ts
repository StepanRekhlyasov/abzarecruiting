import type { AbzaFormValues } from '@shared/types'
import type { TagDto } from '@entities/tag'

export function tagToFormValues(tag: TagDto): AbzaFormValues {
  return {
    name: tag.name,
  }
}
