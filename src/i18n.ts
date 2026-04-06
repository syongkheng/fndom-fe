import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zh from './locales/zh'

const saved = localStorage.getItem('fndom-locale') ?? 'en'

export const i18n = createI18n({
  legacy: false,
  locale: saved,
  fallbackLocale: 'en',
  messages: { en, zh },
})
