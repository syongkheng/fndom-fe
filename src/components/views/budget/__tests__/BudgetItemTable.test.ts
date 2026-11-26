import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ElementPlus from 'element-plus'
import en from '@/locales/en'
import zh from '@/locales/zh'
import type { BudgetItem } from '@/interfaces/forms/budget/BudgetItem'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))

import BudgetItemTable from '../BudgetItemTable.vue'

describe('BudgetItemTable — clearing a category', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    setActivePinia(createPinia())
    http.post.mockReset()
    http.post.mockImplementation(async (_url: string, body: Partial<BudgetItem>) => ({
      data: { data: { id: 'i1', name: 'Sofa', status: 'to_buy', sortOrder: 0, ...body } },
    }))
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
  })

  it('saves null (not undefined, which JSON drops) to /item/:id/update when the category is cleared', async () => {
    const items: BudgetItem[] = [{ id: 'i1', name: 'Sofa', category: 'Furniture', status: 'to_buy', sortOrder: 0 }]
    const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, zh } })
    wrapper = mount(BudgetItemTable, {
      attachTo: document.body,
      props: { sessionId: 's1', items, categoryOptions: ['Furniture'] },
      global: { plugins: [i18n, ElementPlus] },
    })
    await flushPromises()

    const select = wrapper.find('.items-table .el-select')
    expect(select.exists()).toBe(true)
    // the clear icon only renders while hovered
    await select.trigger('mouseenter')
    await select.trigger('mouseover')
    await flushPromises()
    const clear = wrapper.find('.items-table .el-select__clear')
    expect(clear.exists()).toBe(true)
    await clear.trigger('click')
    await flushPromises()

    const call = http.post.mock.calls.find(([url]) => url === '/budget/s1/item/i1/update')
    expect(call, 'update request').toBeTruthy()
    expect(JSON.parse(JSON.stringify(call![1]))).toEqual({ category: null })
  })
})
