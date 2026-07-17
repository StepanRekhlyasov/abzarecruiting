import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { AbzaModal } from '@features/abza-modal'
import { AsyncEntitySelect } from '@shared/ui/inputs'
import { useAttributesTable } from '../model'

export function LinkToProfileModal() {
  const { t } = useTranslation()
  const {
    isLinkToProfileModalOpen,
    setIsLinkToProfileModalOpen,
    linkToProfileModalMode,
    linkCandidate,
    setLinkCandidate,
    selectedIds,
    isLoading,
    loadCandidateOptions,
    handleLinkToCandidateSubmit,
  } = useAttributesTable()

  const isUnlink = linkToProfileModalMode === 'unlink'

  return (
    <AbzaModal
      open={isLinkToProfileModalOpen}
      config={{
        title: t(
          isUnlink ? 'attributes.linkToProfile.unlinkTitle' : 'attributes.linkToProfile.title',
        ),
        submitLabel: t(
          isUnlink ? 'attributes.linkToProfile.unlinkSubmit' : 'attributes.linkToProfile.submit',
        ),
        cancelLabel: t('attributes.linkToProfile.cancel'),
      }}
      onOpenChange={setIsLinkToProfileModalOpen}
      onSubmit={() => {
        void handleLinkToCandidateSubmit()
      }}
      isLoading={isLoading}
      submitDisabled={!linkCandidate}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {t('attributes.linkToProfile.hint', { count: selectedIds.length })}
        </Typography>
        <AsyncEntitySelect
          label={t('attributes.linkToProfile.candidate')}
          value={linkCandidate}
          onChange={setLinkCandidate}
          loadOptions={loadCandidateOptions}
          disabled={isLoading}
        />
      </Box>
    </AbzaModal>
  )
}
