import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { FndManageEvent } from '@/interfaces/forms/FndManageEvent.model'
import { ref } from 'vue'

export function useEventManager() {
  const events = ref<FndManageEvent[]>([])
  const retrieveAllEvents = async () => {
    const retrievedEvent = await HttpClient.get(ApiRoute.EVENT.RETRIEVE)
      .then((res) => {
        return res.data.data
      })
      .catch((err) => {
        console.error('Something went wrong retrieving events: ', err)
      })

    events.value = retrievedEvent
  }

  const createEvent = async (event: FndManageEvent) => {
    const createEventResult = await HttpClient.post(ApiRoute.EVENT.ADD, event)
      .then((res) => {
        console.log('Res: ', res.data)
        return res.data.data
      })
      .catch((err) => {
        console.error('Something went wrong creating event: ', err)
      })
    console.log('Create events result: ', createEventResult)
  }

  const updateEvent = async (event: FndManageEvent, id: number) => {
    const updateEventResult = await HttpClient.post(ApiRoute.EVENT.UPDATE, { ...event, id })
      .then((res) => {
        console.log('Res: ', res.data)
        return res.data.data
      })
      .catch((err) => {
        console.error('Something went wrong updating event: ', err)
      })

    console.log('Update events result: ', updateEventResult)
  }

  const deleteEvent = async (event: FndManageEvent) => {
    const deleteEventResult = await HttpClient.post(ApiRoute.EVENT.DELETE, { id: event.id })
      .then((res) => {
        return res.data.data
      })
      .catch((err) => {
        console.error('Something went wrong deleting event: ', err)
      })

    console.log('Delete event Result: ', deleteEventResult)
  }

  return { events, retrieveAllEvents, createEvent, updateEvent, deleteEvent }
}
