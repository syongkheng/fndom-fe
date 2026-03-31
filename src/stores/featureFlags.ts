import { defineStore } from 'pinia'
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'

export const useFeatureFlagStore = defineStore('featureFlags', {
  state: () => ({
    flags: {} as Record<string, boolean>,
    loaded: false,
  }),

  actions: {
    async fetchFlags() {
      try {
        const res = await HttpClient.get(ApiRoute.FEATURE.GET_ALL)
        this.flags = res.data.data as Record<string, boolean>
      } catch {
        // fail silently — features default to false if unreachable
      } finally {
        this.loaded = true
      }
    },

    isEnabled(key: string): boolean {
      if (!(key in this.flags)) return true  // no flag in DB = always on
      return this.flags[key]
    },
  },
})
