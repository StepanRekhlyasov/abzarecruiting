export type { CreateTagRequest, DeleteTagItem, TagDto, UpdateTagRequest } from '@shared/types'
export { createTag, deleteTag, deleteTagsBatch, ensureTags, fetchTags, updateTag } from './api/tagApi'
export {
  ensureTagByName,
  ensureTagsByNames,
  getTagOptionsFromValues,
  isNewTagOption,
  loadTagOptions,
  resolveTagIds,
  resolveTagOptions,
  tagsToSelectOptions,
} from './lib/tagOptions'
export { TagsField } from './ui/TagsField'
export type { TagsFieldProps } from './ui/TagsField'
