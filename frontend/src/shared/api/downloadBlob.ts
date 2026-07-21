import { isAxiosError } from 'axios'
import { parseApiError } from '@shared/lib/errors'

export function parseFileNameFromContentDisposition(
  disposition: string | undefined,
  fallbackFileName: string,
): string {
  const fileNameMatch = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
  if (!fileNameMatch?.[1]) {
    return fallbackFileName
  }

  return decodeURIComponent(fileNameMatch[1].replace(/"/g, ''))
}

export function triggerBlobDownload(data: Blob, fileName: string): void {
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function throwBlobApiError(error: unknown): Promise<never> {
  if (isAxiosError(error) && error.response?.data instanceof Blob) {
    const text = await error.response.data.text()
    try {
      const parsed = JSON.parse(text) as { message?: string }
      throw new Error(parsed.message ?? parseApiError(error))
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        throw new Error(parseApiError(error))
      }

      throw parseError
    }
  }

  throw new Error(parseApiError(error))
}

export async function downloadApiBlob(
  request: () => Promise<{ data: Blob; headers: Record<string, unknown> }>,
  fallbackFileName: string,
): Promise<void> {
  try {
    const { data, headers } = await request()
    const disposition = headers['content-disposition'] as string | undefined
    const fileName = parseFileNameFromContentDisposition(disposition, fallbackFileName)
    triggerBlobDownload(data, fileName)
  } catch (error) {
    await throwBlobApiError(error)
  }
}
