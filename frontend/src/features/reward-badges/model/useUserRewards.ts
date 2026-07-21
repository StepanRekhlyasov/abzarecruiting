import { useEffect, useState } from 'react'
import { fetchUserRewards, type UserRewardsDto } from '@entities/user'

export function useUserRewards(userId: string | undefined) {
  const [rewards, setRewards] = useState<UserRewardsDto | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(userId))

  useEffect(() => {
    if (!userId) {
      setRewards(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    void fetchUserRewards(userId, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setRewards(data)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRewards(null)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [userId])

  return { rewards, isLoading }
}
