import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))
vi.mock('@/analytics/events', () => ({
  Analytics: { authLogin: vi.fn(), authRegister: vi.fn(), authVerified: vi.fn(), authLogout: vi.fn() },
}))

import { useAuthenticationStore } from '@/stores/authentication'

const t = (key: string) => i18n.global.t(key)

// Axios error shapes: a network error has a request but no response.
const networkError = () => Object.assign(new Error('Network Error'), { request: {}, response: undefined })
const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { request: {}, response: { status, data: {} } })

describe('authentication store — handleAuthenticate (preflight)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    http.post.mockReset()
  })

  it('returns true when the account exists and posts email + system', async () => {
    http.post.mockResolvedValue({ data: { data: { exist: true } } })
    const store = useAuthenticationStore()
    store.form.email = 'a@b.co'

    await expect(store.handleAuthenticate()).resolves.toBe(true)
    expect(http.post).toHaveBeenCalledWith('/auth/preflight', { email: 'a@b.co', system: 'fnd' })
    expect(store.registerError).toBe('')
    expect(store.loading).toBe(false)
  })

  it('returns false for a new email (exist: false)', async () => {
    http.post.mockResolvedValue({ data: { data: { exist: false } } })
    const store = useAuthenticationStore()
    store.form.email = 'new@b.co'
    await expect(store.handleAuthenticate()).resolves.toBe(false)
    expect(store.registerError).toBe('')
  })

  it('returns false when a 2xx response has no exist flag', async () => {
    http.post.mockResolvedValue({ data: {} })
    const store = useAuthenticationStore()
    store.form.email = 'new@b.co'
    await expect(store.handleAuthenticate()).resolves.toBe(false)
  })

  it.each(['', 'not-an-email', 'a@b', 'a b@c.de'])('returns null without calling the API for invalid email %j', async (email) => {
    const store = useAuthenticationStore()
    store.form.email = email
    await expect(store.handleAuthenticate()).resolves.toBeNull()
    expect(http.post).not.toHaveBeenCalled()
    expect(store.registerError).toBe(t('auth.errors.invalid_email_format'))
    expect(store.loading).toBe(false)
  })

  it('returns null with the network message on a network error', async () => {
    http.post.mockRejectedValue(networkError())
    const store = useAuthenticationStore()
    store.form.email = 'a@b.co'
    await expect(store.handleAuthenticate()).resolves.toBeNull()
    expect(store.registerError).toBe(t('auth.errors.network'))
    expect(store.loading).toBe(false)
  })

  it('returns null with the too-many-attempts message on 429', async () => {
    http.post.mockRejectedValue(httpError(429))
    const store = useAuthenticationStore()
    store.form.email = 'a@b.co'
    await expect(store.handleAuthenticate()).resolves.toBeNull()
    expect(store.registerError).toBe(t('auth.errors.too_many_attempts'))
    expect(store.registerError).not.toBe('auth.errors.too_many_attempts')
  })

  it.each([400, 500, 503])('returns null with the generic message on HTTP %i', async (status) => {
    http.post.mockRejectedValue(httpError(status))
    const store = useAuthenticationStore()
    store.form.email = 'a@b.co'
    await expect(store.handleAuthenticate()).resolves.toBeNull()
    expect(store.registerError).toBe(t('auth.errors.unknown'))
  })

  it('clears a previous error before a successful retry', async () => {
    const store = useAuthenticationStore()
    store.form.email = 'a@b.co'
    http.post.mockRejectedValueOnce(httpError(429))
    await store.handleAuthenticate()
    expect(store.registerError).not.toBe('')

    http.post.mockResolvedValueOnce({ data: { data: { exist: true } } })
    await expect(store.handleAuthenticate()).resolves.toBe(true)
    expect(store.registerError).toBe('')
  })

  it('has a zh translation for the new too_many_attempts key', () => {
    i18n.global.locale.value = 'zh'
    expect(t('auth.errors.too_many_attempts')).not.toBe('auth.errors.too_many_attempts')
    expect(t('auth.errors.too_many_attempts')).not.toBe(i18n.global.t('auth.errors.too_many_attempts', {}, { locale: 'en' }))
  })
})
