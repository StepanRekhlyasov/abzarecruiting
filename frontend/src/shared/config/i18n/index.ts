import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ru from './locales/ru.json'

const LOCALE_STORAGE_KEY = 'abza.locale'
const SUPPORTED_LOCALES = ['ru', 'en'] as const

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return SUPPORTED_LOCALES.some((locale) => locale === value)
}

function resolveInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isSupportedLocale(stored)) {
      return stored
    }
  } catch {
    // ignore storage access errors
  }

  return 'ru'
}

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: resolveInitialLocale(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

i18next.on('languageChanged', (language) => {
  const normalized = language.split('-')[0]
  if (!isSupportedLocale(normalized)) {
    return
  }

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
  } catch {
    // ignore storage access errors
  }
})

export const i18n = i18next
