import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ElementPlus from 'element-plus'
import en from '@/locales/en'
import zh from '@/locales/zh'
import type { ApplePayTransaction } from '@/interfaces/ApplePayTransaction.model'
import { NOW, at, tx, money, plainNumber, newestFirst } from './fixtures'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ path: '/apple-pay', query: {}, params: {} }),
}))

// Chart.js can't render in jsdom; the stub exposes the props it would draw.
vi.mock('vue-chartjs', () => ({
  Pie: defineComponent({
    name: 'Pie',
    props: { data: { type: Object, required: true }, options: { type: Object, required: true } },
    setup: () => () => h('div', { class: 'pie-stub' }),
  }),
}))

import ApplePayDashboardView from '../ApplePayDashboardView.vue'

const Nov = 10

// jsdom's Blob has no .text()
const readBlob = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsText(b)
  })
const Oct = 9

function mockApi(rows: ApplePayTransaction[]) {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/applepay') return { data: { data: rows } }
    // SS key status: no key yet, so the setup guide is open by default
    return { data: { data: { hasKey: false, name: null, createdDt: null, keyHint: null } } }
  })
}

async function mountView(rows: ApplePayTransaction[]) {
  mockApi(newestFirst(rows))
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, zh } })
  const wrapper = mount(ApplePayDashboardView, {
    attachTo: document.body,
    global: {
      plugins: [i18n, ElementPlus],
      stubs: { PageBackButton: true, transition: false },
    },
  })
  await flushPromises()
  await nextTick()
  return wrapper
}

const texts = (w: VueWrapper, selector: string) => w.findAll(selector).map((el) => el.text().replace(/[ \t\r\n]+/g, ' ').trim())

const calendarCell = (w: VueWrapper, day: number) =>
  w.findAll('.calendar-cell').find((c) => !c.classes('calendar-cell--out') && c.find('.calendar-cell-date').text() === String(day))!

// November 2026 fixture: SGD 20.00 total, CNY 100.00, MYR 200.00.
// October has SGD 10.00 and a big CNY row that must not leak into the delta.
function multiCurrencyRows() {
  return [
    tx({ id: 's1', amount: 10, occurredDt: at(Nov, 18, 10), category: 'Food', cardLast4: '1234' }),
    tx({ id: 's2', amount: 5.5, occurredDt: at(Nov, 18, 12), category: 'Transport', source: 'v1', name: 'iPhone' }),
    tx({ id: 'c1', amount: 88, currency: 'CNY', occurredDt: at(Nov, 18, 14), category: 'Food', cardLast4: '9999' }),
    tx({ id: 'c2', amount: 12, currency: 'CNY', occurredDt: at(Nov, 19, 9), category: 'Shopping', cardLast4: '9999' }),
    tx({ id: 'm1', amount: 200, currency: 'MYR', occurredDt: at(Nov, 10, 9), category: 'Hotel', cardLast4: '9999' }),
    // Legacy row from before the currency column existed: treated as SGD
    tx({ id: 'legacy', amount: 4.5, currency: undefined as unknown as string, occurredDt: at(Nov, 5, 9), category: 'Food' }),
    tx({ id: 'o1', amount: 10, occurredDt: at(Oct, 15, 9), category: 'Food' }),
    tx({ id: 'o2', amount: 1000, currency: 'CNY', occurredDt: at(Oct, 16, 9), category: 'Food' }),
  ]
}

describe('ApplePayDashboardView — multi-currency', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    setActivePinia(createPinia())
    http.get.mockReset()
    http.post.mockReset()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  describe('transactions tab summary card', () => {
    it('headline total is SGD only (legacy rows without currency count as SGD), other currencies listed below, largest first', async () => {
      wrapper = await mountView(multiCurrencyRows())
      expect(wrapper.find('.month-summary-value').text()).toBe(money(20))
      expect(texts(wrapper, '.month-summary-foreign')).toEqual([`+ ${money(200, 'MYR')}`, `+ ${money(100, 'CNY')}`])
    })

    it('shows no foreign lines when the month is SGD only', async () => {
      wrapper = await mountView([tx({ amount: 7.25, occurredDt: at(Nov, 3) })])
      expect(wrapper.find('.month-summary-value').text()).toBe(money(7.25))
      expect(wrapper.findAll('.month-summary-foreign')).toHaveLength(0)
    })

    it('shows a zero SGD headline when the month only has foreign spend', async () => {
      wrapper = await mountView([tx({ amount: 50, currency: 'JPY', occurredDt: at(Nov, 3) })])
      expect(wrapper.find('.month-summary-value').text()).toBe(money(0))
      expect(texts(wrapper, '.month-summary-foreign')).toEqual([`+ ${money(50, 'JPY')}`])
    })

    it('month-over-month delta compares SGD only (Oct SGD 10 -> Nov SGD 20 = +100%)', async () => {
      wrapper = await mountView(multiCurrencyRows())
      const delta = wrapper.find('.month-summary-delta')
      expect(delta.exists()).toBe(true)
      expect(delta.classes()).toContain('month-summary-delta--up')
      expect(delta.text()).toContain('100')
    })

    it('hides the delta when last month had only foreign spend (no SGD to compare against)', async () => {
      wrapper = await mountView([
        tx({ amount: 10, occurredDt: at(Nov, 3) }),
        tx({ amount: 500, currency: 'CNY', occurredDt: at(Oct, 3) }),
      ])
      expect(wrapper.find('.month-summary-delta').exists()).toBe(false)
    })

    it('sparkline only plots SGD spend', async () => {
      wrapper = await mountView(multiCurrencyRows())
      const cols = wrapper.findAll('.month-spark-col')
      expect(cols).toHaveLength(30)
      const bar = (day: number) => cols[day - 1].find('.month-spark-bar')
      // 18 Nov: SGD 15.50 (CNY 88 ignored)
      expect(cols[17].attributes('title')).toContain(money(15.5))
      expect(bar(18).classes()).not.toContain('month-spark-bar--empty')
      // 19 Nov and 10 Nov: foreign only -> empty bar
      expect(bar(19).classes()).toContain('month-spark-bar--empty')
      expect(bar(10).classes()).toContain('month-spark-bar--empty')
    })
  })

  describe('transactions list', () => {
    it('day-group header shows one total per currency, SGD first', async () => {
      wrapper = await mountView(multiCurrencyRows())
      const totals = texts(wrapper, '.tx-day-total')
      // newest first: 19 Nov, 18 Nov, 10 Nov, 5 Nov
      expect(totals).toEqual([
        money(12, 'CNY'),
        `${money(15.5)} · ${money(88, 'CNY')}`,
        money(200, 'MYR'),
        money(4.5),
      ])
    })

    it('each row is formatted in its own currency', async () => {
      wrapper = await mountView(multiCurrencyRows())
      const rowAmounts = texts(wrapper, '.tx-row-amount')
      expect(rowAmounts).toContain(money(88, 'CNY'))
      expect(rowAmounts).toContain(money(200, 'MYR'))
      expect(rowAmounts).toContain(money(4.5))
    })
  })

  describe('likely duplicate detection', () => {
    const banner = (w: VueWrapper) => w.find('.duplicate-banner')

    it('pairs an NFC tap with an SMS of the same amount and currency', async () => {
      wrapper = await mountView([
        tx({ amount: 10, source: 'v1', name: 'iPhone', occurredDt: at(Nov, 18, 10, 0) }),
        tx({ amount: 10, source: 'v2', cardLast4: '1234', occurredDt: at(Nov, 18, 10, 2) }),
      ])
      expect(banner(wrapper).exists()).toBe(true)
    })

    it('does not pair rows with the same amount but different currencies', async () => {
      wrapper = await mountView([
        tx({ amount: 10, source: 'v1', name: 'iPhone', occurredDt: at(Nov, 18, 10, 0) }),
        tx({ amount: 10, currency: 'CNY', source: 'v2', cardLast4: '1234', occurredDt: at(Nov, 18, 10, 2) }),
      ])
      expect(banner(wrapper).exists()).toBe(false)
    })

    it('treats a row with no currency as SGD when pairing', async () => {
      wrapper = await mountView([
        tx({ amount: 10, source: 'v1', name: 'iPhone', occurredDt: at(Nov, 18, 10, 0) }),
        tx({ amount: 10, currency: '', source: 'v2', cardLast4: '1234', occurredDt: at(Nov, 18, 10, 2) }),
      ])
      expect(banner(wrapper).exists()).toBe(true)
    })
  })

  describe('CSV export', () => {
    it('writes each row\'s own currency in the Currency column', async () => {
      const blobs: Blob[] = []
      const createObjectURL = vi.fn((b: Blob) => {
        blobs.push(b)
        return 'blob:test'
      })
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      wrapper = await mountView(multiCurrencyRows())
      await wrapper.find('button[aria-label="Export CSV"]').trigger('click')

      expect(blobs).toHaveLength(1)
      const csv = (await readBlob(blobs[0])).replace(/^﻿/, '')
      const lines = csv.split('\r\n')
      expect(lines[0]).toBe('Date,Merchant,Amount,Currency,Category,Card / Device,Source')
      const currencyByAmount = Object.fromEntries(
        lines.slice(1).map((l) => {
          const cols = l.split(',')
          return [cols[2], cols[3]]
        }),
      )
      expect(currencyByAmount).toEqual({ '12.00': 'CNY', '88.00': 'CNY', '5.50': 'SGD', '10.00': 'SGD', '200.00': 'MYR', '4.50': 'SGD' })
      clickSpy.mockRestore()
    })
  })

  describe('statistics tab', () => {
    it('total tile is SGD with foreign totals underneath; daily average is SGD-only and labelled SGD', async () => {
      wrapper = await mountView(multiCurrencyRows())
      const tiles = wrapper.findAll('.stat-tile')
      expect(tiles[0].find('.stat-tile-value').text()).toBe(money(20))
      expect(texts(tiles[0] as unknown as VueWrapper, '.stat-tile-sub')).toEqual([
        `+ ${money(200, 'MYR')}`,
        `+ ${money(100, 'CNY')}`,
      ])
      // transactions count still includes every currency
      expect(tiles[1].find('.stat-tile-value').text()).toBe('6')
      expect(tiles[2].find('.stat-tile-value').text()).toBe(money(20 / 30))
      expect(tiles[2].find('.stat-tile-sub').text()).toBe('SGD')
    })

    it('daily average has no SGD label when there is no foreign spend', async () => {
      wrapper = await mountView([tx({ amount: 30, occurredDt: at(Nov, 2) })])
      const tiles = wrapper.findAll('.stat-tile')
      expect(tiles[2].find('.stat-tile-value').text()).toBe(money(1))
      expect(tiles[2].find('.stat-tile-sub').exists()).toBe(false)
    })

    it('renders one category + card pie pair per currency, SGD first then by amount', async () => {
      wrapper = await mountView(multiCurrencyRows())
      const sections = wrapper.findAll('.currency-section')
      expect(sections.map((s) => s.find('.currency-section-title').text())).toEqual([
        'SGD spending',
        'MYR spending',
        'CNY spending',
      ])

      // SGD section: category pie excludes CNY/MYR rows
      const sgdPies = sections[0].findAllComponents({ name: 'Pie' })
      expect(sgdPies).toHaveLength(2)
      const sgdCategory = sgdPies[0].props('data') as { labels: string[]; datasets: Array<{ data: number[] }> }
      expect(Object.fromEntries(sgdCategory.labels.map((l, i) => [l, sgdCategory.datasets[0].data[i]]))).toEqual({
        Food: 14.5,
        Transport: 5.5,
      })
      expect(texts(sections[0] as unknown as VueWrapper, '.pie-breakdown-amount')).toContain(money(14.5))

      // CNY section
      const cnyPies = sections[2].findAllComponents({ name: 'Pie' })
      const cnyCategory = cnyPies[0].props('data') as { labels: string[]; datasets: Array<{ data: number[] }> }
      expect(Object.fromEntries(cnyCategory.labels.map((l, i) => [l, cnyCategory.datasets[0].data[i]]))).toEqual({
        Food: 88,
        Shopping: 12,
      })
      const cnyCard = cnyPies[1].props('data') as { labels: string[]; datasets: Array<{ data: number[] }> }
      expect(cnyCard.labels).toEqual(['•• 9999'])
      expect(cnyCard.datasets[0].data).toEqual([100])
      expect(texts(sections[2] as unknown as VueWrapper, '.pie-breakdown-amount')).toEqual([
        money(88, 'CNY'),
        money(12, 'CNY'),
        money(100, 'CNY'),
      ])

      // Tooltip formats in the section's currency
      const options = cnyPies[0].props('options') as {
        plugins: { tooltip: { callbacks: { label: (ctx: unknown) => string } } }
      }
      expect(options.plugins.tooltip.callbacks.label({ label: 'Food', parsed: 88 })).toBe(`Food: ${money(88, 'CNY')}`)
    })

    it('with a single currency there is one section and no section title', async () => {
      wrapper = await mountView([tx({ amount: 30, occurredDt: at(Nov, 2), category: 'Food' })])
      const sections = wrapper.findAll('.currency-section')
      expect(sections).toHaveLength(1)
      expect(sections[0].find('.currency-section-title').exists()).toBe(false)
      expect(sections[0].findAllComponents({ name: 'Pie' })).toHaveLength(2)
    })

    it('with no spend in the month shows a single empty section with "No data"', async () => {
      wrapper = await mountView([tx({ amount: 30, occurredDt: at(Oct, 2) })])
      const sections = wrapper.findAll('.currency-section')
      expect(sections).toHaveLength(1)
      expect(sections[0].findAllComponents({ name: 'Pie' })).toHaveLength(0)
      expect(texts(sections[0] as unknown as VueWrapper, '.chart-empty')).toEqual(['No data', 'No data'])
    })

    it('a month with only one foreign currency gets a single section for that currency', async () => {
      wrapper = await mountView([tx({ amount: 40, currency: 'THB', occurredDt: at(Nov, 2), category: 'Food' })])
      const sections = wrapper.findAll('.currency-section')
      expect(sections).toHaveLength(1)
      expect(texts(sections[0] as unknown as VueWrapper, '.pie-breakdown-amount')).toContain(money(40, 'THB'))
    })

    it('calendar shows SGD amounts only and flags foreign spend by currency code', async () => {
      wrapper = await mountView(multiCurrencyRows())
      expect(wrapper.find('.calendar-currency-note').text()).toBe('Amounts in SGD')

      const mixed = calendarCell(wrapper, 18)
      expect(mixed.find('.calendar-cell-amount').text()).toBe(`-${plainNumber(15.5)}`)
      expect(mixed.find('.calendar-cell-foreign').text()).toBe('+CNY')

      const foreignOnly = calendarCell(wrapper, 19)
      expect(foreignOnly.find('.calendar-cell-amount').exists()).toBe(false)
      expect(foreignOnly.find('.calendar-cell-foreign').text()).toBe('CNY')
      expect(foreignOnly.classes()).toContain('calendar-cell--has-spend')

      const sgdOnly = calendarCell(wrapper, 5)
      expect(sgdOnly.find('.calendar-cell-amount').text()).toBe(`-${plainNumber(4.5)}`)
      expect(sgdOnly.find('.calendar-cell-foreign').exists()).toBe(false)

      const empty = calendarCell(wrapper, 1)
      expect(empty.classes()).not.toContain('calendar-cell--has-spend')
    })

    it('a foreign-only day is selectable and its detail list shows the amount with its currency', async () => {
      wrapper = await mountView(multiCurrencyRows())
      await calendarCell(wrapper, 19).trigger('click')
      expect(texts(wrapper, '.day-detail-amount')).toEqual([`-${money(12, 'CNY')}`])

      await calendarCell(wrapper, 18).trigger('click')
      // SGD rows show the bare number (card is under "Amounts in SGD"), foreign rows carry their currency
      expect(texts(wrapper, '.day-detail-amount')).toEqual([
        `-${money(88, 'CNY')}`,
        `-${plainNumber(5.5)}`,
        `-${plainNumber(10)}`,
      ])
    })

    it('clicking an empty day selects nothing', async () => {
      wrapper = await mountView(multiCurrencyRows())
      await calendarCell(wrapper, 1).trigger('click')
      expect(wrapper.findAll('.day-detail-item')).toHaveLength(0)
    })
  })

  describe('manual add dialog', () => {
    async function openDialog(w: VueWrapper) {
      await w.find('button[aria-label="Add transaction"]').trigger('click')
      await flushPromises()
    }
    const dialog = () => document.body.querySelector('.el-dialog') as HTMLElement
    const saveButton = () =>
      Array.from(dialog().querySelectorAll('.el-dialog__footer button')).find((b) => b.textContent?.trim() === 'Add') as
        | HTMLButtonElement
        | undefined
    // The form inputs are Element Plus widgets; drive the bound model directly.
    const form = (w: VueWrapper) =>
      (w.vm as unknown as { addForm: { amount?: number; currency: string; merchant: string; occurredAt: Date; category: string } })
        .addForm

    it('defaults the currency to SGD and labels the amount without a fixed currency', async () => {
      wrapper = await mountView([])
      await openDialog(wrapper)
      expect(form(wrapper).currency).toBe('SGD')
      const labels = Array.from(dialog().querySelectorAll('.el-form-item__label')).map((l) => l.textContent?.trim())
      expect(labels).toContain('Amount')
      expect(labels).toContain('Currency')
      expect(dialog().querySelector('.add-currency-input')?.textContent).toContain('SGD')
    })

    it('resets the currency to SGD each time the dialog is opened', async () => {
      wrapper = await mountView([])
      await openDialog(wrapper)
      form(wrapper).currency = 'CNY'
      await nextTick()
      await openDialog(wrapper)
      expect(form(wrapper).currency).toBe('SGD')
    })

    it('offers common currencies plus any currency already used in transactions', async () => {
      wrapper = await mountView([tx({ amount: 1, currency: 'IDR', occurredDt: at(Nov, 2) })])
      const options = (wrapper.vm as unknown as { currencyOptions: string[] }).currencyOptions
      expect(options[0]).toBe('SGD')
      expect(options).toEqual(expect.arrayContaining(['CNY', 'MYR', 'USD', 'IDR']))
      expect(new Set(options).size).toBe(options.length)
    })

    it('sends the chosen currency, trimmed and upper-cased', async () => {
      http.post.mockImplementation(async (_url: string, body: Record<string, unknown>) => ({
        data: { data: tx({ amount: body.amount as number, currency: body.currency as string, occurredDt: body.occurredDt as number }) },
      }))
      wrapper = await mountView([])
      await openDialog(wrapper)
      Object.assign(form(wrapper), { amount: 88, currency: ' cny ', merchant: 'Hotpot', occurredAt: new Date(at(Nov, 19, 20)) })
      await nextTick()
      expect(saveButton()?.disabled).toBe(false)
      saveButton()!.click()
      await flushPromises()

      expect(http.post).toHaveBeenCalledWith('/applepay', {
        amount: 88,
        currency: 'CNY',
        merchant: 'Hotpot',
        occurredDt: at(Nov, 19, 20),
        category: null,
      })
    })

    it('disables Save for a currency that is not a 3-letter code', async () => {
      wrapper = await mountView([])
      await openDialog(wrapper)
      Object.assign(form(wrapper), { amount: 10, merchant: 'Shop', currency: 'RM' })
      await nextTick()
      expect(saveButton()?.disabled).toBe(true)

      form(wrapper).currency = 'S$D'
      await nextTick()
      expect(saveButton()?.disabled).toBe(true)

      form(wrapper).currency = 'myr'
      await nextTick()
      expect(saveButton()?.disabled).toBe(false)
    })
  })

  describe('setup guide — Citibank tab', () => {
    async function selectBank(w: VueWrapper, name: string) {
      const btn = w.findAll('.bank-guide-selector .el-radio-button').find((b) => b.text() === name)
      expect(btn, `bank tab ${name}`).toBeDefined()
      await btn!.find('input').setValue(true)
      await nextTick()
    }

    it('lists Citibank as a bank option', async () => {
      wrapper = await mountView([])
      expect(texts(wrapper, '.bank-guide-selector .el-radio-button')).toContain('Citibank')
    })

    it('shows the supported note and trigger phrase, with no Shortcut link or screenshots', async () => {
      wrapper = await mountView([])
      await selectBank(wrapper, 'Citibank')
      const guide = wrapper.find('.bank-guide')
      const note = guide.find('.bank-guide-note')
      expect(note.exists()).toBe(true)
      expect(note.text()).toContain('Citibank SMS alerts are supported')
      expect(note.text()).toContain('Set the automation to run when the message contains:')
      expect(note.find('.bank-guide-trigger').text()).toBe('There was a charge of')
      expect(guide.find('.bank-guide-shortcut-link').exists()).toBe(false)
      expect(guide.find('.bank-guide-image-pending').exists()).toBe(false)
      expect(guide.findAll('figure')).toHaveLength(0)
    })

    it('other banks still show their screenshots and Shortcut link, without the note', async () => {
      wrapper = await mountView([])
      await selectBank(wrapper, 'Citibank')
      await selectBank(wrapper, 'DBS/POSB')
      const guide = wrapper.find('.bank-guide')
      expect(guide.find('.bank-guide-note').exists()).toBe(false)
      expect(guide.findAll('figure').length).toBeGreaterThan(0)
      const link = guide.find('.bank-guide-shortcut-link')
      expect(link.exists()).toBe(true)
      expect(link.attributes('href')).toMatch(/^https:\/\//)
    })
  })
})

describe('locales', () => {
  it('both en and zh define the new Apple Pay keys', () => {
    for (const messages of [en, zh] as Array<typeof en>) {
      expect(messages.applepay.add.currency).toBeTruthy()
      expect(messages.applepay.stats.currencySection).toContain('{currency}')
      expect(messages.applepay.setup.bankSupportedNote).toContain('{bank}')
      expect(messages.applepay.setup.bankTriggerLabel).toBeTruthy()
      expect(messages.applepay.add.amount).not.toMatch(/SGD/)
    }
  })
})
