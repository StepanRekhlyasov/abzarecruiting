import { useEffect } from 'react'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { AbzaError } from '@features/abza-error'
import { CandidateProfileProvider, useCandidateProfile } from './model'
import { MeInfo } from './parts/MeInfo'

type ProfileProps = {
  candidateId: string
}

function ProfileContent() {
  const { t } = useTranslation()
  const { error, actionError, setActionError, isAutosaveActive } = useCandidateProfile()

  useEffect(() => {
    if (!error && !actionError) {
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error, actionError])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" component="h1">
          {t('profile.title')}
        </Typography>
        <SaveIcon
          aria-label="autosave"
          sx={{
            fontSize: 34,
            color: isAutosaveActive ? 'success.main' : 'text.disabled',
            opacity: isAutosaveActive ? 1 : 0.35,
            transition: 'color 0.2s ease, opacity 0.2s ease',
          }}
        />
      </Box>

      <AbzaError error={error} />
      <AbzaError error={actionError} onClose={() => setActionError(null)} />
      {!error ? <MeInfo /> : null}
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
