import axios from 'axios'
import { getAccessToken } from '@shared/lib/auth/accessToken'
import { logout } from '@entities/user'
import { API_BASE_URL } from './config'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && typeof config.headers === 'object' && 'delete' in config.headers) {
      config.headers.delete('Content-Type')
    } else if (config.headers) {
      delete (config.headers as Record<string, unknown>)['Content-Type']
    }
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    if (status === 401) {
      logout()
    }

    return Promise.reject(error)
  },
)
