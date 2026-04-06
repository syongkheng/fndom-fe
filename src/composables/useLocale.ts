import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
// @ts-ignore — EP locale files ship without .d.ts declarations
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
// @ts-ignore
import en from 'element-plus/dist/locale/en.mjs'

const STORAGE_KEY = 'fndom-locale'

export function useLocale() {
  const { locale } = useI18n({ useScope: 'global' })

  const epLocale = computed(() => locale.value === 'zh' ? zhCn : en)

  const setLocale = (lang: 'en' | 'zh') => {
    locale.value = lang
    localStorage.setItem(STORAGE_KEY, lang)
  }

  return { locale, epLocale, setLocale }
}
