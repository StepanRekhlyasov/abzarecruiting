import { apiClient } from '@shared/api/client'
import type { FileAttributeValue } from '@shared/types'

export type UploadFileKind = 'image' | 'file'

export type UploadFileResponse = FileAttributeValue & {
  contentType: string
  size: number
}

export async function uploadFile(file: File, kind: UploadFileKind): Promise<UploadFileResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.post<UploadFileResponse>(`/files?kind=${kind}`, formData)
  return data
}
