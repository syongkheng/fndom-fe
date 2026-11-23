import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ElementPlus from 'element-plus'
import en from '@/locales/en'
import zh from '@/locales/zh'
import { useAuthenticationStore } from '@/stores/authentication'
import type { ApplePayTransaction } from '@/interfaces/ApplePayTransaction.model'
import { NOW, at, tx, money, newestFirst } from '../../applepay/__tests__/fixtures'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ path: '/dashboard', query: {}, params: {} }),
}))

import RecentTransactionsCard from '../RecentTransactionsCard.vue'

const Nov = 10
const Oct = 9

async function mountCard(rows: ApplePayTransaction[]) {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/applepay') return { data: { data: newestFirst(rows) } }
    return { data: { data: { hasKey: true, name: null, createdDt: null, keyHint: null } } }
  })
  useAuthenticationStore().isAuthenticated = true
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, zh } })
  const wrapper = mount(RecentTransactionsCard, {
    global: { plugins: [i18n, ElementPlus], stubs: { SignInPrompt: true } },
  })
  await flushPromises()
  return wrapper
}

const texts = (w: VueWrapper, selector: string) =>
  w.findAll(selector).map((el) => el.text().replace(/[ \t\r\n]+/g, ' ').trim())

describe('RecentTransactionsCard — multi-currency', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    setActivePinia(createPinia())
    http.get.mockReset()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.useRealTimers()
  })

  it('headline is the SGD-only month total; foreign totals listed underneath, largest first', async () => {
    wrapper = await mountCard([
      tx({ amount: 10, occurredDt: at(Nov, 18) }),
      tx({ amount: 2.5, currency: undefined as unknown as string, occurredDt: at(Nov, 17) }), // legacy row => SGD
      tx({ amount: 30, currency: 'CNY', occurredDt: at(Nov, 16) }),
      tx({ amount: 15, currency: 'CNY', occurredDt: at(Nov, 15) }),
      tx({ amount: 80, currency: 'MYR', occurredDt: at(Nov, 14) }),
      tx({ amount: 999, occurredDt: at(Oct, 30) }), // last month: excluded
    ])
    expect(wrapper.find('.expense-hero-stat-value').text()).toBe(money(12.5))
    const subs = texts(wrapper, '.expense-hero-stat-sub')
    expect(subs.slice(0, 2)).toEqual([`+ ${money(80, 'MYR')}`, `+ ${money(45, 'CNY')}`])
    // payment count still covers every currency this month
    expect(subs[2]).toBe('5 payments')
  })

  it('no foreign lines when this month is SGD only', async () => {
    wrapper = await mountCard([tx({ amount: 10, occurredDt: at(Nov, 18) })])
    expect(wrapper.find('.expense-hero-stat-value').text()).toBe(money(10))
    expect(texts(wrapper, '.expense-hero-stat-sub')).toEqual(['1 payment'])
  })

  it('recent rows are formatted in their own currency', async () => {
    wrapper = await mountCard([
      tx({ amount: 10, occurredDt: at(Nov, 18) }),
      tx({ amount: 30, currency: 'CNY', occurredDt: at(Nov, 19) }),
    ])
    expect(texts(wrapper, '.expense-hero-amount')).toEqual([money(30, 'CNY'), money(10)])
  })
})
