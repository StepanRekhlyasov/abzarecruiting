import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { AbzaError } from '@features/abza-error'
import { buildProfileRewardBadges, useUserRewards } from '@features/reward-badges'
import { Profile } from '@widgets/candidate-profile'
import { RecruiterProfile } from '@widgets/recruiter-profile'

type ProfileViewProps = {
  userId: string
}

/** Renders candidate or recruiter profile UI based on the profile owner's role. */
export function ProfileView({ userId }: ProfileViewProps) {
  const { rewards, isLoading } = useUserRewards(userId)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (!rewards) {
    return <AbzaError error="error.profile.load" />
  }

  const rewardBadges = buildProfileRewardBadges(rewards)

  if (rewards.role === 'Candidate') {
    return <Profile candidateId={userId} rewardBadges={rewardBadges} />
  }

  return <RecruiterProfile userId={userId} rewardBadges={rewardBadges} />
}
