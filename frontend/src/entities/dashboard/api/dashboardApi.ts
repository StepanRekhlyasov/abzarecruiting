import { isAxiosError } from 'axios'
import type { DashboardDto } from '@shared/types'
import { apiClient } from '@shared/api'
import { parseApiError } from '@shared/lib/errors'

type FetchDashboardOptions = {
  signal?: AbortSignal
}

export async function fetchDashboard(options?: FetchDashboardOptions): Promise<DashboardDto> {
  try {
    const { data } = await apiClient.get<DashboardDto>('/dashboard', {
      signal: options?.signal,
    })
    return data
  } catch (error) {
    if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
      throw error
    }

    throw new Error(parseApiError(error))
  }
}
