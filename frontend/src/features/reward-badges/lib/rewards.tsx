import type { ReactNode } from 'react'
import type { UserRewardsDto } from '@shared/types'
import { Icon5cv } from '@app/assets/icons/icon-5cv'
import { Icon5Hearts } from '@app/assets/icons/icon-5hearts'
import { Icon5Messages } from '@app/assets/icons/icon-5messages'
import { Icon10Hearts } from '@app/assets/icons/icon-10hearts'

export type RewardBadgeKind = 'cv5' | 'hearts5' | 'hearts10' | 'messages5'

export type RewardBadgeConfig = {
  kind: RewardBadgeKind
  unlocked: boolean
}

export const REWARD_THRESHOLDS = {
  cv5: 5,
  hearts5: 5,
  hearts10: 10,
  messages5: 5,
} as const

export const REWARD_HINT_KEYS: Record<RewardBadgeKind, string> = {
  cv5: 'rewards.hints.cv5',
  hearts5: 'rewards.hints.hearts5',
  hearts10: 'rewards.hints.hearts10',
  messages5: 'rewards.hints.messages5',
}

/** Badges for a profile page — based on the profile owner's role, not the viewer. */
export function buildProfileRewardBadges(rewards: UserRewardsDto | null): RewardBadgeConfig[] {
  if (!rewards) {
    return []
  }

  if (rewards.role === 'Candidate') {
    return [
      {
        kind: 'cv5',
        unlocked: rewards.publishedResumesCount >= REWARD_THRESHOLDS.cv5,
      },
      {
        kind: 'hearts5',
        unlocked: rewards.maxPublishedResumeLikes >= REWARD_THRESHOLDS.hearts5,
      },
    ]
  }

  if (rewards.role === 'Recruiter') {
    return [
      {
        kind: 'hearts10',
        unlocked: rewards.likesGivenCount >= REWARD_THRESHOLDS.hearts10,
      },
    ]
  }

  return []
}

export function renderRewardIcon(kind: RewardBadgeKind): ReactNode {
  switch (kind) {
    case 'cv5':
      return <Icon5cv />
    case 'hearts5':
      return <Icon5Hearts />
    case 'hearts10':
      return <Icon10Hearts />
    case 'messages5':
      return <Icon5Messages />
  }
}
