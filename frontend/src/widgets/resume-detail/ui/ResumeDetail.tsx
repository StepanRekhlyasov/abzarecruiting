import { useMemo, useState } from 'react'
import DownloadIcon from '@mui/icons-material/Download'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { AbzaError } from '@features/abza-error'
import { ResumeLike } from '@features/resume-like'
import {
  toComparableAttributeValue,
  type AttributeDraftValue,
  type ProfileAttributeDto,
} from '@shared/types'
import { useAttributeAutosave } from '@shared/lib/autosave'
import { getErrorKey } from '@shared/lib/errors'
import { positionDetailPath } from '@shared/config/routes'
import { AutosaveButton, CandidateProfileLink } from '@shared/ui'
import { AttributeSection } from '@widgets/candidate-profile'
import { ResumeDetailProvider, useResumeDetail } from '../model'
import { ResumeProjectsSection } from '../parts/ResumeProjectsSection'

type ResumeDetailProps = {
  resumeId: number
}

type ResumeTab = 'personal' | 'info' | 'projects'

function hasAllAttributeValues(
  attributes: ProfileAttributeDto[],
  draft: Record<number, AttributeDraftValue>,
) {
  return attributes.every(
    (attribute) => toComparableAttributeValue(draft[attribute.id] ?? '').trim() !== '',
  )
}

function withResumeAttributeLabels(
  attributes: ProfileAttributeDto[],
  t: (key: string) => string,
): ProfileAttributeDto[] {
  return attributes.map((attribute) => {
    if (attribute.name === 'Email') {
      return { ...attribute, name: t('cvs.detail.labels.email') }
    }

    if (attribute.name === 'Phone number') {
      return { ...attribute, name: t('cvs.detail.labels.phone') }
    }

    if (attribute.name === 'Profile photo') {
      return { ...attribute, name: t('cvs.detail.labels.photo') }
    }

    return attribute
  })
}

function ResumeDetailContent() {
  const { t } = useTranslation()
  const {
    resume,
    attributes,
    projects,
    isLoading,
    isMutating,
    error,
    actionError,
    canEdit,
    canLike,
    canPublish,
    isAutosaveActive,
    isDownloading,
    setActionError,
    setAutosaveActive,
    saveAttributeValues,
    togglePublished,
    applyLikeState,
    downloadPdf,
  } = useResumeDetail()

  const [activeTab, setActiveTab] = useState<ResumeTab>('personal')

  const {
    fieldErrors,
    isDirty,
    isSaving,
    canSave,
    getDraftSnapshot,
    handleChange,
    handleManualSave,
    flush,
  } = useAttributeAutosave({
    attributes,
    canEdit,
    isLoading,
    saveAttributeValues,
    setActionError,
    setAutosaveActive,
  })

  const allFilled = hasAllAttributeValues(attributes, getDraftSnapshot())
  const displayAttributes = useMemo(
    () => withResumeAttributeLabels(attributes, t),
    [attributes, t],
  )
  const personalAttributes = useMemo(
    () => displayAttributes.filter((attribute) => attribute.isDefault),
    [displayAttributes],
  )
  const infoAttributes = useMemo(
    () => displayAttributes.filter((attribute) => !attribute.isDefault),
    [displayAttributes],
  )

  const showSaveButton = canEdit && (activeTab === 'personal' || activeTab === 'info')

  const handlePublishClick = async () => {
    await flush()
    await togglePublished()
  }

  const publishDisabled = useMemo(() => {
    if (!canPublish || isMutating || isSaving) {
      return true
    }

    if (resume?.published) {
      return false
    }

    return !allFilled
  }, [allFilled, canPublish, isMutating, isSaving, resume?.published])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (error || !resume) {
    return <AbzaError error={error ?? 'error.resumes.load'} />
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <AbzaError error={actionError} onClose={() => setActionError(null)} />

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ minWidth: 0 }}>
              <Link
                component={RouterLink}
                to={positionDetailPath(resume.positionId)}
                underline="hover"
                color="inherit"
              >
                {t('cvs.detail.forPosition', { name: resume.positionName })}
              </Link>
            </Typography>
            {showSaveButton ? (
              <AutosaveButton
                label={t('profile.save')}
                onClick={handleManualSave}
                disabled={!canSave}
                active={isAutosaveActive || isDirty}
              />
            ) : null}
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ minWidth: 0 }}>
            <CandidateProfileLink candidateId={resume.candidateId}>
              {t('cvs.detail.candidate', {
                name: resume.candidateName || resume.candidateId,
              })}
            </CandidateProfileLink>
          </Typography>
          <ResumeLike
            resumeId={resume.id}
            likesCount={resume.likesCount}
            likedByCurrentUser={resume.likedByCurrentUser}
            canToggle={canLike}
            onChange={applyLikeState}
            onError={(likeError) => setActionError(getErrorKey(likeError, 'error.resumes.like'))}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {canPublish ? (
            <>
              {!resume.published ? (
                <Tooltip title={t('cvs.detail.publishHint')}>
                  <InfoOutlinedIcon color="action" fontSize="small" sx={{ mr: 0.5 }} />
                </Tooltip>
              ) : (
                <Tooltip title={t('cvs.detail.unpublishHint')}>
                  <InfoOutlinedIcon color="action" fontSize="small" sx={{ mr: 0.5 }} />
                </Tooltip>
              )}
              <Button
                variant="contained"
                onClick={() => void handlePublishClick()}
                disabled={publishDisabled}
                sx={{ boxShadow: 'none' }}
              >
                {resume.published ? t('cvs.detail.unpublish') : t('cvs.detail.publish')}
              </Button>
            </>
          ) : null}

          {resume.published ? (
            <Tooltip title={t('cvs.detail.downloadPdf')}>
              <span>
                <IconButton
                  color="primary"
                  onClick={() => void downloadPdf()}
                  disabled={isDownloading}
                  aria-label={t('cvs.detail.downloadPdf')}
                >
                  {isDownloading ? <CircularProgress size={20} /> : <DownloadIcon />}
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value: ResumeTab) => setActiveTab(value)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab value="personal" label={t('cvs.detail.tabs.personal')} />
          <Tab value="info" label={t('cvs.detail.tabs.info')} />
          <Tab value="projects" label={t('cvs.detail.tabs.projects')} />
        </Tabs>

        {activeTab === 'personal' ? (
          <AttributeSection
            mode="default"
            attributes={personalAttributes}
            onChange={handleChange}
            emptyMessage={t('cvs.detail.personalEmpty')}
            editable={canEdit}
            highlightEmptyFields={true}
            fieldErrors={fieldErrors}
          />
        ) : null}

        {activeTab === 'info' ? (
          <AttributeSection
            mode="default"
            attributes={infoAttributes}
            onChange={handleChange}
            emptyMessage={t('cvs.detail.attributesEmpty')}
            editable={canEdit}
            highlightEmptyFields={true}
            fieldErrors={fieldErrors}
          />
        ) : null}

        {activeTab === 'projects' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {resume.maxProjects > 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('cvs.detail.maxProjects', { count: resume.maxProjects })}
              </Typography>
            ) : null}
            <ResumeProjectsSection projects={projects} />
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

export function ResumeDetail({ resumeId }: ResumeDetailProps) {
  return (
    <ResumeDetailProvider resumeId={resumeId}>
      <ResumeDetailContent />
    </ResumeDetailProvider>
  )
}
