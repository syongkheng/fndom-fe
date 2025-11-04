import { defineStore } from 'pinia'
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { PphsRecord } from '@/interfaces/PphsRecord.model'

export const usePphsStore = defineStore('pphsStore', {
  state: () => ({
    selectedEvent: null as PphsRecord | null,
    viewOnly: false,
    pphsRecords: [] as PphsRecord[],
  }),

  actions: {
    /** Retrieve all events */
    async retrieveAllPphsbByBatch(batch: string) {
      try {
        const res = await HttpClient.post(ApiRoute.PPHS.GET_PPHS_DATA, {
          batch: batch,
        })
        this.pphsRecords = res.data.data.records as PphsRecord[]
      } catch (err) {
        this.pphsRecords = []
      }
    },
  },
})
