import type { ProfileAttributeDto } from '@shared/types'
import { apiClient } from '@shared/api'
import { withApiError } from '@shared/lib/errors'

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
  return withApiError(async () => {
    const { data } = await apiClient.get<ProfileAttributeDto[]>(`/profile/${candidateId}/me`, {
      signal: options?.signal,
    })
    return data
  })
}

export async function setCandidateAttributeValue(
  attributeId: number,
  candidateId: string,
  value: string | null,
  version: number,
): Promise<number> {
  return withApiError(async () => {
    const { data } = await apiClient.post<SetCandidateAttributeValueResponse>(
      `/attribute/${attributeId}/candidate/${candidateId}`,
      { value, version },
    )
    return data.version
  })
}

export type SetCandidateAttributeBatchItem = {
  attributeId: number
  value: string | null
  version: number
}

export type SetCandidateAttributeBatchResult = {
  attributeId: number
  version: number
}

export async function setCandidateAttributeValuesBatch(
  candidateId: string,
  items: SetCandidateAttributeBatchItem[],
): Promise<SetCandidateAttributeBatchResult[]> {
  if (items.length === 0) {
    return []
  }

  return withApiError(async () => {
    const { data } = await apiClient.post<SetCandidateAttributeBatchResult[]>(
      `/profile/${candidateId}/values`,
      { items },
    )
    return data
  })
}

export async function deleteCandidateAttributeValue(
  attributeId: number,
  candidateId: string,
): Promise<void> {
  return withApiError(async () => {
    await apiClient.delete(`/attribute/${attributeId}/candidate/${candidateId}`)
  })
}
