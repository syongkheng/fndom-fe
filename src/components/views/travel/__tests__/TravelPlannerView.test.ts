import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ElementPlus from 'element-plus'
import en from '@/locales/en'
import zh from '@/locales/zh'
import TravelPlannerView from '../TravelPlannerView.vue'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), defaults: { baseURL: '' } }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))

// Guest draft mode: the planner loads the trip from localStorage, no backend.
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ path: '/travel/draft', query: {}, params: {} }),
}))

vi.mock('@/components/views/travel/TravelMapView.vue', () => ({
  default: defineComponent({ name: 'TravelMapView', setup: () => () => h('div', { class: 'map-stub' }) }),
}))

const DRAFT_KEY = 'fndom-draft-itinerary'

const item = (n: number, title: string, budget: unknown) => ({
  _localIndex: `agenda-${n}`,
  title,
  day: 1,
  unknownTime: true,
  files: [],
  _fileIdsToDelete: [],
  _filesToInsert: [],
  _agendaToFileMapping: [],
  ...(budget === 'absent' ? {} : { budget }),
})

async function mountPlanner(agendaItems: unknown[]) {
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({ sessionTitle: 'Trip', unknownDate: true, durationInDays: 1, numberOfPax: 1, agendaItems, bookings: [] }),
  )
  const pinia = createPinia()
  setActivePinia(pinia)
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, zh } })
  const wrapper = mount(TravelPlannerView, {
    attachTo: document.body,
    global: {
      plugins: [pinia, i18n, ElementPlus],
      // ElBacktop targets the app layout's .wrapper, which isn't mounted here.
      stubs: { transition: false, ElBacktop: true },
    },
  })
  await flushPromises()
  return wrapper
}

const card = (w: VueWrapper, title: string) => {
  const c = w.findAll('.agenda-card').find((el) => el.find('.card-title').text() === title)
  expect(c, `agenda card "${title}" rendered`).toBeTruthy()
  return c!
}

describe('TravelPlannerView — agenda card budget (I5: 0 is a real amount)', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.body.innerHTML = ''
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    localStorage.clear()
    document.body.innerHTML = ''
  })

  it('shows a budget of 0 (and the meta row for it) when there is no time or city', async () => {
    wrapper = await mountPlanner([item(1, 'Free museum', 0)])
    const c = card(wrapper, 'Free museum')
    expect(c.find('.card-meta').exists()).toBe(true)
    const budget = c.find('.card-budget')
    expect(budget.exists()).toBe(true)
    expect(budget.text()).toContain('0')
    // No time/city, so no leading separator.
    expect(c.find('.card-sep').exists()).toBe(false)
  })

  it('shows a positive budget, formatted', async () => {
    wrapper = await mountPlanner([item(1, 'Dinner', 1250)])
    expect(card(wrapper, 'Dinner').find('.card-budget').text()).toContain((1250).toLocaleString())
  })

  it('hides the budget and the empty meta row when the budget is null or absent', async () => {
    wrapper = await mountPlanner([item(1, 'Cleared', null), item(2, 'Never set', 'absent')])
    for (const title of ['Cleared', 'Never set']) {
      const c = card(wrapper, title)
      expect(c.find('.card-budget').exists()).toBe(false)
      expect(c.find('.card-meta').exists()).toBe(false)
    }
  })
})
