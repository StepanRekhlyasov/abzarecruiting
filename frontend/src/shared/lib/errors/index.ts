import { isAxiosError } from 'axios'
import { i18n } from '@shared/config/i18n'

export type ApiFieldErrorPayload = {
  message: string
  params?: Record<string, string>
}

type ApiErrorBody = {
  message?: string
  errors?: string[]
  fieldErrors?: Record<string, string | ApiFieldErrorPayload>
}

export class ApiFieldValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string>) {
    super(message)
    this.name = 'ApiFieldValidationError'
    this.fieldErrors = fieldErrors
  }
}

export const UNKNOWN_ERROR_KEY = 'error.unknown'

export function parseApiError(error: unknown): string {
  if (error instanceof ApiFieldValidationError) {
    return error.message
  }

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

function resolveFieldErrorPayload(payload: string | ApiFieldErrorPayload): string {
  if (typeof payload === 'string') {
    return resolveErrorMessage(payload) ?? payload
  }

  if (i18n.exists(payload.message)) {
    return i18n.t(payload.message, payload.params)
  }

  return payload.message
}

function normalizeFieldErrors(
  fieldErrors: Record<string, string | ApiFieldErrorPayload>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, payload]) => [field, resolveFieldErrorPayload(payload)]),
  )
}

export function parseApiFieldErrors(error: unknown): Record<string, string> | null {
  if (error instanceof ApiFieldValidationError) {
    return error.fieldErrors
  }

  if (isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined
    if (!body?.fieldErrors) {
      return null
    }

    return normalizeFieldErrors(body.fieldErrors)
  }

  return null
}

export function throwParsedApiError(error: unknown): never {
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      throw error
    }

    const body = error.response?.data as ApiErrorBody | undefined

    if (body?.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
      throw new ApiFieldValidationError(
        body.message ?? 'error.attributes.validationFailed',
        normalizeFieldErrors(body.fieldErrors),
      )
    }
  }

  throw new Error(parseApiError(error))
}

export async function withApiError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    throwParsedApiError(error)
  }
}

export function isRequestCanceled(error: unknown): boolean {
  return isAxiosError(error) && error.code === 'ERR_CANCELED'
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
