export type {
  ResumeCandidateAttributeDto,
  ResumeDto,
  ResumeListItemDto,
  UpdateResumeRequest,
} from '@shared/types'
export {
  createResume,
  deleteResume,
  downloadResumePdf,
  fetchResume,
  fetchResumePositionIds,
  fetchResumes,
  updateResume,
} from './api/resumeApi'
