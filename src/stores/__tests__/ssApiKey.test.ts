import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))

import { useSsApiKeyStore } from '@/stores/ssApiKey'
import { StorageKey, StorageUtils } from '@/utilities/StorageUtils'

describe('ssApiKey store — revokeApiKey', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    http.post.mockReset()
    http.delete.mockReset()
    localStorage.clear()
  })

  it('revokes via POST /ss-key/api-key/delete with an empty body, not HTTP DELETE', async () => {
    http.post.mockResolvedValue({ data: { data: {} } })
    await useSsApiKeyStore().revokeApiKey()
    expect(http.post).toHaveBeenCalledWith('/ss-key/api-key/delete', {})
    expect(http.delete).not.toHaveBeenCalled()
  })

  it('removes the locally stored key after a successful revoke', async () => {
    http.post.mockResolvedValue({ data: { data: {} } })
    StorageUtils.set(StorageKey.SS_API_KEY, 'ss_test', 'local')
    await useSsApiKeyStore().revokeApiKey()
    expect(StorageUtils.get(StorageKey.SS_API_KEY, 'local')).toBeFalsy()
  })

  it('keeps the locally stored key and rethrows when the revoke fails', async () => {
    http.post.mockRejectedValue(new Error('500'))
    StorageUtils.set(StorageKey.SS_API_KEY, 'ss_test', 'local')
    await expect(useSsApiKeyStore().revokeApiKey()).rejects.toThrow()
    expect(StorageUtils.get(StorageKey.SS_API_KEY, 'local')).toBeTruthy()
  })
})
