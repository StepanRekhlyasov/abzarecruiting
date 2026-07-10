import { isAxiosError } from 'axios'
import type { ProfileAttributeDto } from '@shared/types'
import { apiClient } from '@shared/api'
import { parseApiError } from '@shared/lib/errors'

type FetchOptions = {
  signal?: AbortSignal
}

type SetCandidateAttributeValueResponse = {
  version: number
}

export async function fetchMeInfo(
  candidateId: string,
  options?: FetchOptions,
): Promise<ProfileAttributeDto[]> {
  try {
    const { data } = await apiClient.get<ProfileAttributeDto[]>(`/profile/${candidateId}/me`, {
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

export async function setCandidateAttributeValue(
  attributeId: number,
  candidateId: string,
  value: string | null,
  version: number,
): Promise<number> {
  try {
    const { data } = await apiClient.post<SetCandidateAttributeValueResponse>(
      `/attribute/${attributeId}/candidate/${candidateId}`,
      { value, version },
    )
    return data.version
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

export async function deleteCandidateAttributeValue(
  attributeId: number,
  candidateId: string,
): Promise<void> {
  try {
    await apiClient.delete(`/attribute/${attributeId}/candidate/${candidateId}`)
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}
