import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ElementPlus, { ElInputNumber } from 'element-plus'
import en from '@/locales/en'
import zh from '@/locales/zh'
import type { AgendaItem } from '@/interfaces/forms/itinerary/AgendaItem'
import AgendaDrawer from '../AgendaDrawer.vue'

vi.mock('vue-router', () => ({ useRoute: () => ({ params: {}, query: {}, path: '/travel' }) }))

const agendaItem = (extra: Partial<AgendaItem> = {}): AgendaItem => ({
  id: '1',
  title: 'Park',
  unknownTime: true,
  files: [],
  _fileIdsToDelete: [],
  _filesToInsert: [],
  _agendaToFileMapping: [],
  ...extra,
})

async function mountDrawer(item: AgendaItem | null) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, zh } })
  const wrapper = mount(AgendaDrawer, {
    attachTo: document.body,
    props: { modelValue: true, item, isNew: !item, drawerDirection: 'rtl', drawerSize: '400px', dayCount: 3 },
    global: { plugins: [i18n, ElementPlus], stubs: { transition: false } },
  })
  await flushPromises()
  return wrapper
}

const clickSave = async () => {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.drawer-actions button'))
  buttons[1].click()
  await flushPromises()
}
const savedItem = (w: VueWrapper) => (w.emitted('save')?.[0]?.[0] ?? null) as AgendaItem | null
const setBudget = async (w: VueWrapper, v: number | null) => {
  w.findComponent(ElInputNumber).vm.$emit('update:modelValue', v)
  await flushPromises()
}

describe('AgendaDrawer — budget on save (I5: 0 is a real amount)', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
  })

  it('keeps an unchanged budget of 0', async () => {
    wrapper = await mountDrawer(agendaItem({ budget: 0 }))
    await clickSave()
    expect(savedItem(wrapper)?.budget).toBe(0)
  })

  it('saves a budget changed to 0 as 0', async () => {
    wrapper = await mountDrawer(agendaItem({ budget: 25 }))
    await setBudget(wrapper, 0)
    await clickSave()
    expect(savedItem(wrapper)?.budget).toBe(0)
  })

  it('sends null when the budget is cleared', async () => {
    wrapper = await mountDrawer(agendaItem({ budget: 25 }))
    await setBudget(wrapper, null)
    await clickSave()
    const saved = savedItem(wrapper)!
    expect(saved.budget).toBeNull()
    expect(JSON.parse(JSON.stringify(saved))).toHaveProperty('budget', null)
  })

  it('leaves an untouched budget out of a new item (backend stores NULL)', async () => {
    wrapper = await mountDrawer(null)
    wrapper.findComponent({ name: 'ElInput' }).vm.$emit('update:modelValue', 'Museum')
    await flushPromises()
    await clickSave()
    const saved = savedItem(wrapper)!
    expect(saved.title).toBe('Museum')
    expect(saved.budget).toBeUndefined()
  })
})
