import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import { useTranslation } from 'react-i18next'
import {
  REWARD_HINT_KEYS,
  renderRewardIcon,
  type RewardBadgeConfig,
} from '../lib/rewards'

export type RewardBadgesProps = {
  badges: RewardBadgeConfig[]
  size?: number
}

export function RewardBadges({ badges, size = 48 }: RewardBadgesProps) {
  const { t } = useTranslation()

  if (badges.length === 0) {
    return null
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      {badges.map((badge) => (
        <Tooltip
          key={badge.kind}
          title={t(REWARD_HINT_KEYS[badge.kind])}
          arrow
          describeChild
        >
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              width: size,
              height: size,
              lineHeight: 0,
              cursor: 'default',
              filter: badge.unlocked ? 'none' : 'grayscale(1)',
              opacity: badge.unlocked ? 1 : 0.45,
              transition: 'filter 0.2s ease, opacity 0.2s ease',
              '& > svg': {
                width: '100%',
                height: '100%',
                display: 'block',
              },
            }}
            aria-label={t(REWARD_HINT_KEYS[badge.kind])}
          >
            {renderRewardIcon(badge.kind)}
          </Box>
        </Tooltip>
      ))}
    </Box>
  )
}
