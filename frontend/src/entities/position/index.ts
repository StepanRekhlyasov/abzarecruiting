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
  deletePositionTag,
  fetchPosition,
  fetchPositions,
  updatePosition,
  upsertPositionAttribute,
  upsertPositionTag,
} from './api/positionApi'
