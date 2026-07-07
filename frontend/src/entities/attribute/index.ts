export type {
  AttributeDto,
  AttributeInputType,
  AttributeValueType,
  CreateAttributeRequest,
  UpdateAttributeRequest,
} from '@shared/types'
export {
  ATTRIBUTE_INPUT_TYPES,
  ATTRIBUTE_VALUE_TYPES,
  getInputTypesForValueType,
  INPUT_TYPES_BY_VALUE_TYPE,
} from './model/constants'
export { DEFAULT_ATTRIBUTE_NAMES, isDefaultAttributeName } from './model/defaults'
export {
  createAttribute,
  deleteAttribute,
  deleteAttributesBatch,
  fetchAttributes,
  fetchLinkedProfileAttributeIds,
  linkAttributesToProfileBatch,
  unlinkAttributesFromProfileBatch,
  updateAttribute,
} from './api/attributeApi'
