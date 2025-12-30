import { defineStore } from 'pinia'
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { PphsRecord } from '@/interfaces/PphsRecord.model'

export const usePphsStore = defineStore('pphsStore', {
  state: () => ({
    selectedRecord: undefined as PphsRecord | undefined,
    viewOnly: false,
    pphsRecords: [] as PphsRecord[],
  }),

  actions: {
    /** Retrieve all PPHS records by batch */
    async retrieveAllPphsbByBatch(batch: string) {
      try {
        const res = await HttpClient.post(ApiRoute.PPHS.GET_PPHS_DATA, { batch })
        this.pphsRecords = res.data.data.records as PphsRecord[]
      } catch (err) {
        console.error('Failed to retrieve PPHS records', err)
        this.pphsRecords = []
      }
    },

    /** Update PPHS coordinates and mutate the object directly */
    async updatePphsCoordinates(record: PphsRecord): Promise<boolean> {
      try {
        const res = await HttpClient.post(ApiRoute.PPHS.UPDATE_PPHS_COORDINATES, {
          address: record.address,
          lat: record.lat,
          lng: record.lng,
          formedUrl: record.formedUrl,
        })
        if (!res.data.data) return false

        const index = this.pphsRecords.findIndex((r) => r.address === record.address)
        if (index !== -1) {
          Object.assign(this.pphsRecords[index], record) // keep reference
        }

        if (this.selectedRecord?.address === record.address) {
          Object.assign(this.selectedRecord, record) // keep reference
        }

        return true
      } catch (err) {
        console.error('Error updating PPHS coordinates', err)
        return false
      }
    },
  },
})
