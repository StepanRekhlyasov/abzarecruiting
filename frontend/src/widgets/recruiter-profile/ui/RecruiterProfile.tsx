import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { RewardBadges, type RewardBadgeConfig } from '@features/reward-badges'

type RecruiterProfileProps = {
  userId: string
  rewardBadges?: RewardBadgeConfig[]
}

export function RecruiterProfile({ rewardBadges = [] }: RecruiterProfileProps) {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h4" component="h1">
          {t('profile.title')}
        </Typography>
        <RewardBadges badges={rewardBadges} />
      </Box>
    </Box>
  )
}
