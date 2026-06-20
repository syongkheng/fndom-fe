import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  BabyDiaperRecord,
  BabyFeedingRecord,
  LogDiaperChangePayload,
  LogFeedingPayload,
} from '@/interfaces/Baby.model'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { StorageKey, StorageUtils } from '@/utilities/StorageUtils'

export const useBabyTrackingStore = defineStore('babyTracking', () => {
  const feedingRecords = ref<BabyFeedingRecord[]>([])
  const diaperRecords = ref<BabyDiaperRecord[]>([])
  const isLoadingFeeding = ref(false)
  const isLoadingDiaper = ref(false)
  const error = ref<string | null>(null)

  async function fetchFeeding() {
    isLoadingFeeding.value = true
    error.value = null
    try {
      const res = await HttpClient.get(ApiRoute.SS_BABY.FEEDING)
      feedingRecords.value = res.data.data as BabyFeedingRecord[]
    } catch {
      error.value = 'Failed to load feeding records'
    } finally {
      isLoadingFeeding.value = false
    }
  }

  async function fetchDiaper() {
    isLoadingDiaper.value = true
    error.value = null
    try {
      const res = await HttpClient.get(ApiRoute.SS_BABY.DIAPER)
      diaperRecords.value = res.data.data as BabyDiaperRecord[]
    } catch {
      error.value = 'Failed to load diaper records'
    } finally {
      isLoadingDiaper.value = false
    }
  }

  async function logDiaper(payload: LogDiaperChangePayload) {
    const res = await HttpClient.post(ApiRoute.SS_BABY.DIAPER, payload)
    const insertedRow = res.data.data as BabyDiaperRecord
    diaperRecords.value = [insertedRow, ...diaperRecords.value]
    return insertedRow
  }

  async function logFeeding(payload: LogFeedingPayload) {
    // The feeding service still returns `{ echo: {...} }`, not the inserted row,
    // so refetch the list afterward rather than relying on the response shape.
    await HttpClient.post(ApiRoute.SS_BABY.FEEDING, payload)
    await fetchFeeding()
  }

  async function fetchApiKeyStatus(): Promise<{ hasKey: boolean; createdDt: number | null; keyHint: string | null }> {
    const res = await HttpClient.get(ApiRoute.SS_BABY.API_KEY)
    return res.data.data as { hasKey: boolean; createdDt: number | null; keyHint: string | null }
  }

  async function generateApiKey(): Promise<string> {
    const res = await HttpClient.post(ApiRoute.SS_BABY.API_KEY, {})
    const key = res.data.data.key as string
    StorageUtils.set(StorageKey.SS_API_KEY, key, 'local')
    return key
  }

  async function revokeApiKey(): Promise<void> {
    await HttpClient.delete(ApiRoute.SS_BABY.API_KEY)
    StorageUtils.remove(StorageKey.SS_API_KEY, 'local')
  }

  return {
    feedingRecords,
    diaperRecords,
    isLoadingFeeding,
    isLoadingDiaper,
    error,
    fetchFeeding,
    fetchDiaper,
    logDiaper,
    logFeeding,
    fetchApiKeyStatus,
    generateApiKey,
    revokeApiKey,
  }
})
