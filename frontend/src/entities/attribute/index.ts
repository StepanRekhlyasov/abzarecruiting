export type {
  AttributeCategory,
  AttributeDto,
  AttributeInputType,
  AttributeValueType,
  CreateAttributeRequest,
  DeleteAttributeItem,
  UpdateAttributeRequest,
} from '@shared/types'
export {
  ATTRIBUTE_INPUT_TYPES,
  ATTRIBUTE_VALUE_TYPES,
  getInputTypesForValueType,
  INPUT_TYPES_BY_VALUE_TYPE,
} from './model/constants'
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
