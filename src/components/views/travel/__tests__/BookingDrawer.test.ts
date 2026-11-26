import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ElementPlus, { ElSelect } from 'element-plus'
import en from '@/locales/en'
import zh from '@/locales/zh'
import type { ItineraryBooking } from '@/interfaces/forms/itinerary/ItineraryBooking'
import BookingDrawer from '../BookingDrawer.vue'

async function mountDrawer(item: ItineraryBooking | null, paxNames: string[] = []) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, zh } })
  const wrapper = mount(BookingDrawer, {
    attachTo: document.body,
    props: { modelValue: true, item, isNew: !item, paxNames },
    global: { plugins: [i18n, ElementPlus], stubs: { transition: false } },
  })
  await flushPromises()
  return wrapper
}

const footerButtons = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.drawer-footer button'))
const clickSave = async () => {
  footerButtons()[1].click()
  await flushPromises()
}
const savedItem = (w: VueWrapper) => (w.emitted('save')?.[0]?.[0] ?? null) as ItineraryBooking | null
const setPaymentType = async (w: VueWrapper, v: string | undefined) => {
  w.findComponent(ElSelect).vm.$emit('update:modelValue', v)
  await flushPromises()
}

describe('BookingDrawer — payment string on save', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
  })

  it('keeps an unchanged Instant payment', async () => {
    wrapper = await mountDrawer({ id: '1', item: 'Hotel', payment: 'Instant' })
    await clickSave()
    expect(savedItem(wrapper)?.payment).toBe('Instant')
  })

  it('keeps an unchanged Delayed payment with its date', async () => {
    wrapper = await mountDrawer({ id: '1', item: 'Hotel', payment: 'Delayed (2026-12-01)' })
    await clickSave()
    expect(savedItem(wrapper)?.payment).toBe('Delayed (2026-12-01)')
  })

  it('sends null when an Instant payment is cleared in the picker', async () => {
    wrapper = await mountDrawer({ id: '1', item: 'Hotel', payment: 'Instant' })
    await setPaymentType(wrapper, undefined)
    await clickSave()
    const saved = savedItem(wrapper)!
    expect(saved.payment).toBeNull()
    expect(JSON.parse(JSON.stringify(saved))).toHaveProperty('payment', null)
  })

  it('sends null when a Delayed payment is cleared to an empty string', async () => {
    wrapper = await mountDrawer({ id: '1', item: 'Hotel', payment: 'Delayed (2026-12-01)' })
    await setPaymentType(wrapper, '')
    await clickSave()
    expect(savedItem(wrapper)?.payment).toBeNull()
  })

  it('keeps a legacy free-text payment the picker cannot show', async () => {
    wrapper = await mountDrawer({ id: '1', item: 'Hotel', payment: 'Pay at hotel' })
    await clickSave()
    expect(savedItem(wrapper)?.payment).toBe('Pay at hotel')
  })

  it('leaves payment unset for a new booking with no payment chosen', async () => {
    wrapper = await mountDrawer(null)
    const itemInput = document.querySelector<HTMLInputElement>('.drawer-body input')!
    itemInput.value = 'Flight'
    itemInput.dispatchEvent(new Event('input'))
    await flushPromises()
    await clickSave()
    const saved = savedItem(wrapper)!
    expect(saved.item).toBe('Flight')
    expect(saved.payment ?? undefined).toBeUndefined()
  })

  it('builds "Delayed (<date>)" from the picker', async () => {
    wrapper = await mountDrawer({ id: '1', item: 'Hotel' })
    await setPaymentType(wrapper, 'delayed')
    const dateInput = document.querySelector<HTMLInputElement>('.payment-date-input input')!
    expect(dateInput.getAttribute('maxlength')).toBe(String(256 - 'Delayed ()'.length))
    dateInput.value = '2026-12-24'
    dateInput.dispatchEvent(new Event('input'))
    await flushPromises()
    await clickSave()
    expect(savedItem(wrapper)?.payment).toBe('Delayed (2026-12-24)')
  })

  it('does not save without an item name', async () => {
    wrapper = await mountDrawer(null)
    await clickSave()
    expect(wrapper.emitted('save')).toBeUndefined()
  })
})

describe('BookingDrawer — clearing fields', () => {
  let wrapper: VueWrapper | undefined
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
  })

  it('switching away from accommodation sends the accommodation fields as null', async () => {
    wrapper = await mountDrawer({
      id: '1', item: 'Hotel', category: 'accommodation',
      startDate: '2026-12-01', endDate: '2026-12-03', nights: 2, freeCancellation: 'Until Nov 30', breakfast: true,
    })
    const flightBtn = document.querySelectorAll<HTMLButtonElement>('.cat-btn')[0]
    flightBtn.click()
    await flushPromises()
    await clickSave()
    const wire = JSON.parse(JSON.stringify(savedItem(wrapper)))
    expect(wire).toMatchObject({ category: 'flight', startDate: null, endDate: null, nights: null, freeCancellation: null, breakfast: false })
  })

  it('caps text inputs at the qindom column widths', async () => {
    wrapper = await mountDrawer({ id: '1', item: 'Hotel' })
    const maxes = Array.from(document.querySelectorAll<HTMLInputElement>('.drawer-body input[maxlength]')).map((i) => i.getAttribute('maxlength'))
    // item, remarks, link, deposit
    expect(maxes).toEqual(expect.arrayContaining(['512', '128', '1024']))
  })
})
