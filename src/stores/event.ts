import { defineStore } from 'pinia'
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { FndManageEvent } from '@/interfaces/forms/FndManageEvent.model'

export const useEventManagerStore = defineStore('eventManager', {
  state: () => ({
    selectedEvent: null as FndManageEvent | null,
    viewOnly: false,
    events: [] as FndManageEvent[],
  }),

  actions: {
    /** Retrieve all events */
    async retrieveAllEvents() {
      try {
        const res = await HttpClient.get(ApiRoute.EVENT.RETRIEVE)
        this.events = res.data.data
      } catch (err) {
        console.error('Something went wrong retrieving events:', err)
      }
    },

    /** Create a new event */
    async createEvent(event: FndManageEvent) {
      try {
        const res = await HttpClient.post(ApiRoute.EVENT.ADD, event)
        await this.retrieveAllEvents()
      } catch (err) {
        console.error('Something went wrong creating event:', err)
      }
    },

    /** Update an existing event */
    async updateEvent(event: FndManageEvent, id: number) {
      try {
        const res = await HttpClient.post(ApiRoute.EVENT.UPDATE, { ...event, id })
        await this.retrieveAllEvents()
      } catch (err) {
        console.error('Something went wrong updating event:', err)
      }
    },

    /** Delete an event */
    async deleteEvent(event: FndManageEvent) {
      try {
        const res = await HttpClient.post(ApiRoute.EVENT.DELETE, { id: event.id })
        await this.retrieveAllEvents()
      } catch (err) {
        console.error('Something went wrong deleting event:', err)
      }
    },
    async viewEvent(eventId: number) {
      try {
        await HttpClient.post(`${ApiRoute.EVENT.VIEW}`, { id: eventId })
      } catch (err) {
        console.error('Something went wrong viewing event:', err)
        return null
      }
    },
  },
})
