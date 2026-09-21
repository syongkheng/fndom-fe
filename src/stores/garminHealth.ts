import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GarminToday, GarminDailySummary } from '@/interfaces/Garmin.model'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

export const useGarminHealthStore = defineStore('garminHealth', () => {
  const today = ref<GarminToday | null>(null)
  const summary = ref<GarminDailySummary[]>([])
  const isLoadingToday = ref(false)
  const isLoadingSummary = ref(false)
  const error = ref<string | null>(null)

  async function fetchToday() {
    isLoadingToday.value = true
    error.value = null
    try {
      const res = await HttpClient.get(ApiRoute.GARMIN.TODAY)
      today.value = res.data.data as GarminToday
    } catch {
      error.value = 'Failed to load today\'s Garmin data'
    } finally {
      isLoadingToday.value = false
    }
  }

  async function fetchSummary(days = 7) {
    isLoadingSummary.value = true
    error.value = null
    try {
      const res = await HttpClient.get(ApiRoute.GARMIN.SUMMARY(days))
      summary.value = res.data.data as GarminDailySummary[]
    } catch {
      error.value = 'Failed to load Garmin history'
    } finally {
      isLoadingSummary.value = false
    }
  }

  return {
    today,
    summary,
    isLoadingToday,
    isLoadingSummary,
    error,
    fetchToday,
    fetchSummary,
  }
})
