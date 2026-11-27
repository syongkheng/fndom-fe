import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ElementPlus from 'element-plus'
import en from '@/locales/en'
import zh from '@/locales/zh'
import TravelViewerView from '../TravelViewerView.vue'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), defaults: { baseURL: '' } }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ path: '/travel/v/abc', query: {}, params: { shortCode: 'abc' } }),
}))

vi.mock('@/components/views/travel/TravelMapView.vue', () => ({
  default: defineComponent({ name: 'TravelMapView', setup: () => () => h('div', { class: 'map-stub' }) }),
}))

const row = (id: string, title: string, budget: unknown) => ({
  id,
  title,
  unknownTime: true,
  files: [],
  ...(budget === 'absent' ? {} : { budget }),
})

async function mountViewer(agendaItems: unknown[]) {
  http.get.mockResolvedValue({
    data: { data: { sessionTitle: 'Trip', agendaItems, bookings: [] } },
  })
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, zh } })
  const wrapper = mount(TravelViewerView, {
    attachTo: document.body,
    // ElBacktop targets the app layout's .wrapper, which isn't mounted here.
    global: { plugins: [i18n, ElementPlus], stubs: { transition: false, ElBacktop: true } },
  })
  await flushPromises()
  return wrapper
}

const budgetFor = (w: VueWrapper, title: string) => {
  const item = w.findAll('.timeline-item').find((el) => el.find('.item-title').text() === title)
  expect(item, `timeline item "${title}" rendered`).toBeTruthy()
  return item!.find('.item-budget')
}

describe('TravelViewerView — agenda budget pill (I5: 0 is a real amount)', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    http.get.mockReset()
    document.body.innerHTML = ''
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
  })

  it('shows a budget of 0', async () => {
    wrapper = await mountViewer([row('1', 'Free museum', 0)])
    const pill = budgetFor(wrapper, 'Free museum')
    expect(pill.exists()).toBe(true)
    expect(pill.text()).toContain('0')
  })

  it('shows a positive budget, formatted', async () => {
    wrapper = await mountViewer([row('1', 'Dinner', 1250)])
    const pill = budgetFor(wrapper, 'Dinner')
    expect(pill.exists()).toBe(true)
    expect(pill.text()).toContain((1250).toLocaleString())
  })

  it('hides the pill when the budget is null or absent', async () => {
    wrapper = await mountViewer([row('1', 'Cleared', null), row('2', 'Never set', 'absent')])
    expect(budgetFor(wrapper, 'Cleared').exists()).toBe(false)
    expect(budgetFor(wrapper, 'Never set').exists()).toBe(false)
  })
})
