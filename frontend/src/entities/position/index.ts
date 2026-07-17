export type {
  CreatePositionRequest,
  PositionAttributeDto,
  PositionDto,
  PositionLevel,
  PositionTagDto,
  UpdatePositionRequest,
  WorkFormat,
} from '@shared/types'
export { POSITION_LEVELS, WORK_FORMATS } from '@shared/types'
export {
  createPosition,
  deletePosition,
  deletePositionAttribute,
  deletePositionsBatch,
  deletePositionTag,
  duplicatePosition,
  duplicatePositionsBatch,
  fetchPosition,
  fetchPositions,
  syncPositionRelations,
  updatePosition,
  upsertPositionAttribute,
  upsertPositionTag,
} from './api/positionApi'
