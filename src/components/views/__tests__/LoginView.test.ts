import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import { i18n } from '@/i18n'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ path: '/', query: {}, params: {} }),
}))
vi.mock('@/analytics/events', () => ({
  Analytics: { authLogin: vi.fn(), authRegister: vi.fn(), authVerified: vi.fn(), authLogout: vi.fn() },
}))

import LoginView from '../LoginView.vue'
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'

const t = (key: string) => i18n.global.t(key)
const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { request: {}, response: { status, data: {} } })

async function submitEmail(email: string) {
  useLayoutStateStore().loginDialog.isVisible = true
  const wrapper = mount(LoginView, {
    attachTo: document.body,
    global: { plugins: [i18n, ElementPlus], stubs: { transition: false } },
  })
  const store = useAuthenticationStore()
  store.form.email = email
  await flushPromises()
  // el-dialog teleports to body
  document.querySelector('.login-dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }))
  await flushPromises()
  return { wrapper, store }
}

const errorText = () => document.querySelector('.login-dialog .error-text')?.textContent?.trim()

describe('LoginView — email (preflight) step', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    http.post.mockReset()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
  })

  it('moves to the login step when the account exists', async () => {
    http.post.mockResolvedValue({ data: { data: { exist: true } } })
    const r = await submitEmail('a@b.co')
    wrapper = r.wrapper
    expect(r.store.authenticationStep).toBe('login')
  })

  it('moves to the register step for a new email', async () => {
    http.post.mockResolvedValue({ data: { data: { exist: false } } })
    const r = await submitEmail('new@b.co')
    wrapper = r.wrapper
    expect(r.store.authenticationStep).toBe('register')
  })

  it('stays on the email step and shows the message when rate limited (429)', async () => {
    http.post.mockRejectedValue(httpError(429))
    const r = await submitEmail('a@b.co')
    wrapper = r.wrapper
    expect(r.store.authenticationStep).toBe('email')
    expect(errorText()).toBe(t('auth.errors.too_many_attempts'))
  })

  it('stays on the email step on a server error (500), not the register step', async () => {
    http.post.mockRejectedValue(httpError(500))
    const r = await submitEmail('a@b.co')
    wrapper = r.wrapper
    expect(r.store.authenticationStep).toBe('email')
    expect(errorText()).toBe(t('auth.errors.unknown'))
  })

  it('stays on the email step on a network error', async () => {
    http.post.mockRejectedValue(Object.assign(new Error('Network Error'), { request: {} }))
    const r = await submitEmail('a@b.co')
    wrapper = r.wrapper
    expect(r.store.authenticationStep).toBe('email')
    expect(errorText()).toBe(t('auth.errors.network'))
  })

  it('stays on the email step for an invalid email without calling the API', async () => {
    const r = await submitEmail('nope')
    wrapper = r.wrapper
    expect(r.store.authenticationStep).toBe('email')
    expect(http.post).not.toHaveBeenCalled()
  })
})
