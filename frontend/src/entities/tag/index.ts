export type { CreateTagRequest, TagDto, UpdateTagRequest } from '@shared/types'
export { createTag, deleteTag, fetchTags, updateTag } from './api/tagApi'
export {
  ensureTagByName,
  getTagOptionsFromValues,
  isNewTagOption,
  loadTagOptions,
  resolveTagIds,
  tagsToSelectOptions,
} from './lib/tagOptions'
export { TagsField } from './ui/TagsField'
export type { TagsFieldProps } from './ui/TagsField'
