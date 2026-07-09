import { isAxiosError } from 'axios'
import { i18n } from '@shared/config/i18n'

type ApiErrorBody = {
  message?: string
  errors?: string[]
}

export const UNKNOWN_ERROR_KEY = 'error.unknown'

export function parseApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined

    if (body?.errors?.length) {
      return body.errors.join(' ')
    }

    if (body?.message) {
      return body.message
    }

    return UNKNOWN_ERROR_KEY
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return UNKNOWN_ERROR_KEY
}

export function getErrorKey(error: unknown, fallback: string = UNKNOWN_ERROR_KEY): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function resolveErrorMessage(
  errorKeyOrMessage: string | null | undefined,
): string | null {
  if (!errorKeyOrMessage) {
    return null
  }

  return i18n.exists(errorKeyOrMessage) ? i18n.t(errorKeyOrMessage) : errorKeyOrMessage
}
