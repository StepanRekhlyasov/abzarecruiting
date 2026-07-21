import type { DashboardDto } from '@shared/types'
import { apiClient } from '@shared/api'
import { withApiError } from '@shared/lib/errors'

type FetchDashboardOptions = {
  signal?: AbortSignal
}

export async function fetchDashboard(options?: FetchDashboardOptions): Promise<DashboardDto> {
  return withApiError(async () => {
    const { data } = await apiClient.get<DashboardDto>('/dashboard', {
      signal: options?.signal,
    })
    return data
  })
}
