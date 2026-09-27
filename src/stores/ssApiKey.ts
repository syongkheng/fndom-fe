import { defineStore } from 'pinia'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { StorageKey, StorageUtils } from '@/utilities/StorageUtils'

export interface SsApiKeyStatus {
  hasKey: boolean
  name: string | null
  createdDt: number | null
  keyHint: string | null
}

// The generic "ss_" API key used by every Siri Shortcuts integration —
// currently Apple Pay transaction logging. Was split out of the Baby
// Tracker feature (removed) since the key itself was never baby-specific.
export const useSsApiKeyStore = defineStore('ssApiKey', () => {
  async function fetchApiKeyStatus(): Promise<SsApiKeyStatus> {
    const res = await HttpClient.get(ApiRoute.SS_KEY.API_KEY)
    return res.data.data as SsApiKeyStatus
  }

  async function generateApiKey(): Promise<string> {
    const res = await HttpClient.post(ApiRoute.SS_KEY.API_KEY, {})
    const key = res.data.data.key as string
    StorageUtils.set(StorageKey.SS_API_KEY, key, 'local')
    return key
  }

  async function revokeApiKey(): Promise<void> {
    await HttpClient.delete(ApiRoute.SS_KEY.API_KEY)
    StorageUtils.remove(StorageKey.SS_API_KEY, 'local')
  }

  // Renames the active key's label only — the key value itself is untouched,
  // unlike generateApiKey which revokes and replaces it.
  async function renameApiKey(name: string): Promise<SsApiKeyStatus> {
    const res = await HttpClient.post(ApiRoute.SS_KEY.RENAME_API_KEY, { name })
    return res.data.data as SsApiKeyStatus
  }

  return {
    fetchApiKeyStatus,
    generateApiKey,
    revokeApiKey,
    renameApiKey,
  }
})
