export type {
  CreateResumeRequest,
  ResumeCandidateAttributeDto,
  ResumeDto,
  ResumeLikeStateDto,
  ResumeListItemDto,
  UpdateResumeRequest,
} from '@shared/types'
export {
  createResume,
  createResumesBatch,
  deleteResume,
  deleteResumesBatch,
  downloadResumePdf,
  fetchResume,
  fetchResumePositionIds,
  fetchResumes,
  toggleResumeLike,
  updateResume,
} from './api/resumeApi'
