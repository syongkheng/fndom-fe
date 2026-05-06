import { defineStore } from 'pinia'
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { PphsRecord } from '@/interfaces/PphsRecord.model'

export const usePphsStore = defineStore('pphsStore', {
  state: () => ({
    selectedRecord: undefined as PphsRecord | undefined,
    viewOnly: false,
    pphsRecords: [] as PphsRecord[],
    hiddenMarkers: JSON.parse(localStorage.getItem('pphs_hidden_markers') ?? '[]') as string[],
  }),

  actions: {
    async clearPphsCoordinates(address: string): Promise<boolean> {
      try {
        await HttpClient.post(ApiRoute.PPHS.CLEAR_PPHS_COORDINATES, { address })
        const empty = { lat: '', lng: '', formedUrl: '', source: '' }
        const index = this.pphsRecords.findIndex((r) => r.address === address)
        if (index !== -1) Object.assign(this.pphsRecords[index], empty)
        if (this.selectedRecord?.address === address) Object.assign(this.selectedRecord, empty)
        return true
      } catch (err) {
        console.error('Error clearing PPHS coordinates', err)
        return false
      }
    },

    toggleHideMarker(address: string) {
      const idx = this.hiddenMarkers.indexOf(address)
      if (idx !== -1) {
        this.hiddenMarkers.splice(idx, 1)
      } else {
        this.hiddenMarkers.push(address)
      }
      localStorage.setItem('pphs_hidden_markers', JSON.stringify(this.hiddenMarkers))
    },

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

    /** Fetch all geocoding options for an address without saving. Returns null on request failure. */
    async fetchCoordinateOptions(address: string): Promise<Array<{
      source: 'onemap' | 'nominatim'; lat: string; lng: string; formedUrl: string;
    }> | null> {
      try {
        const res = await HttpClient.post(ApiRoute.PPHS.GET_COORDINATE_OPTIONS, { address })
        return res.data.data
      } catch (err) {
        console.error('Error fetching coordinate options', err)
        return null
      }
    },

    /** Force re-geocode an address, bypassing DB cache */
    async refreshPphsCoordinates(address: string): Promise<boolean> {
      try {
        const res = await HttpClient.post(ApiRoute.PPHS.REFRESH_PPHS_COORDINATES, { address })
        const updated = res.data.data as { lat: string; lng: string; formedUrl: string; source: string }

        const index = this.pphsRecords.findIndex((r) => r.address === address)
        if (index !== -1) {
          Object.assign(this.pphsRecords[index], updated)
        }
        if (this.selectedRecord?.address === address) {
          Object.assign(this.selectedRecord, updated)
        }
        return true
      } catch (err) {
        console.error('Error refreshing PPHS coordinates', err)
        return false
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
