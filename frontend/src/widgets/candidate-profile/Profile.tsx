import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { useUnit } from 'effector-react'
import { AbzaError } from '@features/abza-error'
import { $session, isAdmin, isCandidate } from '@entities/user'
import { useAttributeAutosave } from '@shared/lib/autosave'
import { AutosaveButton } from '@shared/ui'
import { CvsTable } from '@widgets/cvs-table'
import { ProjectsTable } from '@widgets/projects-table'
import { CandidateProfileProvider, useCandidateProfile } from './model'
import { AttributeSection } from './parts/AttributeSection'

type ProfileTab = 'info' | 'attributes' | 'projects' | 'resumes'

type ProfileProps = {
  candidateId: string
}

function ProfileContent() {
  const { t } = useTranslation()
  const session = useUnit($session)
  const {
    candidateId,
    meAttributes,
    isLoading,
    isMutating,
    error,
    actionError,
    setActionError,
    isAutosaveActive,
    setAutosaveActive,
    saveAttributeValues,
    loadAttributeOptions,
    addAttributesToProfile,
    removeAttributesFromProfile,
  } = useCandidateProfile()

  const canEditProfile = isAdmin(session) || (isCandidate(session) && session?.id === candidateId)

  const [activeTab, setActiveTab] = useState<ProfileTab>('info')

  const {
    draft,
    isDirty,
    canSave,
    handleChange,
    handleManualSave,
    flush,
    clearTimer,
  } = useAttributeAutosave({
    attributes: meAttributes,
    canEdit: canEditProfile,
    isLoading,
    saveAttributeValues,
    setActionError,
    setAutosaveActive,
  })

  const defaultAttributes = useMemo(
    () => meAttributes.filter((attribute) => attribute.isDefault),
    [meAttributes],
  )
  const addedAttributes = useMemo(
    () => meAttributes.filter((attribute) => !attribute.isDefault),
    [meAttributes],
  )

  const showSaveButton = canEditProfile && (activeTab === 'info' || activeTab === 'attributes')

  useEffect(() => {
    if (!error && !actionError) {
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error, actionError])

  const handleAddAttributes = useCallback(
    async (attributeIds: number[]) => {
      await addAttributesToProfile(attributeIds)
    },
    [addAttributesToProfile],
  )

  const handleRemoveAttribute = useCallback(
    async (attributeId: number) => {
      clearTimer()
      await removeAttributesFromProfile([attributeId])
    },
    [clearTimer, removeAttributesFromProfile],
  )

  const showStandaloneTable = activeTab === 'projects' || activeTab === 'resumes'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" component="h1">
          {t('profile.title')}
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

      <AbzaError error={error} />
      <AbzaError error={actionError} onClose={() => setActionError(null)} />

      {!error ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Tabs
            value={activeTab}
            onChange={(_, value: ProfileTab) => setActiveTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab value="info" label={t('profile.meInfo.title')} />
            <Tab value="attributes" label={t('profile.addedAttributes.title')} />
            <Tab value="projects" label={t('profile.projects.title')} />
            <Tab value="resumes" label={t('profile.resumes.title')} />
          </Tabs>

          {showStandaloneTable ? (
            activeTab === 'projects' ? (
              <ProjectsTable candidateId={candidateId} />
            ) : (
              <CvsTable candidateId={candidateId} />
            )
          ) : isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <>
              {activeTab === 'info' ? (
                <AttributeSection
                  mode="default"
                  attributes={defaultAttributes}
                  draftValues={draft}
                  onChange={handleChange}
                  onForceSave={() => {
                    void flush()
                  }}
                  editable={canEditProfile}
                />
              ) : null}

              {activeTab === 'attributes' ? (
                <AttributeSection
                  mode="attrs"
                  attributes={addedAttributes}
                  draftValues={draft}
                  onChange={handleChange}
                  onForceSave={() => {
                    void flush()
                  }}
                  emptyMessage={t('profile.addedAttributes.empty')}
                  loadAttributeOptions={canEditProfile ? loadAttributeOptions : undefined}
                  onAddAttributes={canEditProfile ? handleAddAttributes : undefined}
                  onRemoveAttribute={canEditProfile ? handleRemoveAttribute : undefined}
                  isAdding={isMutating}
                  editable={canEditProfile}
                />
              ) : null}
            </>
          )}
        </Box>
      ) : null}
    </Box>
  )
}

export function Profile({ candidateId }: ProfileProps) {
  return (
    <CandidateProfileProvider candidateId={candidateId}>
      <ProfileContent />
    </CandidateProfileProvider>
  )
}
