import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))

import { useItineraryStore } from '@/stores/itinerary'

/** What axios would actually put on the wire for the payload of call `n`. */
const wireBody = (n = 0) => JSON.parse(JSON.stringify(http.post.mock.calls[n][1]))

describe('itinerary store — updateItinerary', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    http.post.mockReset()
  })

  it('posts to /itinerary/:sessionId/update and returns the shortCode', async () => {
    http.post.mockResolvedValue({ status: 200, data: { data: { agendaToFileMap: [], shortCode: 'ABC123' } } })
    const store = useItineraryStore()
    store.setSessionId('sess-1')

    await expect(store.updateItinerary()).resolves.toEqual({ isSuccess: true, error: undefined, shortCode: 'ABC123' })
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.post.mock.calls[0][0]).toBe('/itinerary/sess-1/update')
  })

  it('sends cleared access code and dates as null so the backend clears them', async () => {
    http.post.mockResolvedValue({ status: 200, data: { data: { agendaToFileMap: [], shortCode: 'X' } } })
    const store = useItineraryStore()
    store.setSessionId('sess-1')
    store.itinerary.challenge = null
    store.itinerary.startDate = null
    store.itinerary.endDate = null
    store.itinerary.itineraryDateRaw = null

    await store.updateItinerary()
    const body = wireBody()
    expect(body).toHaveProperty('challenge', null)
    expect(body).toHaveProperty('startDate', null)
    expect(body).toHaveProperty('endDate', null)
    expect(body).toHaveProperty('itineraryDateRaw', null)
  })

  it('omits challenge when it is undefined (keeps the existing code)', async () => {
    http.post.mockResolvedValue({ status: 200, data: { data: { agendaToFileMap: [], shortCode: 'X' } } })
    const store = useItineraryStore()
    store.setSessionId('sess-1')
    store.itinerary.challenge = undefined
    await store.updateItinerary()
    expect(wireBody()).not.toHaveProperty('challenge')
  })

  it('sends cleared booking fields and agenda coordinates as null', async () => {
    http.post.mockResolvedValue({ status: 200, data: { data: { agendaToFileMap: [{ agendaId: 9 }], shortCode: 'X' } } })
    const store = useItineraryStore()
    store.setSessionId('sess-1')
    store.itinerary.bookings = [{ item: 'Hotel', remarks: null, price: null, nights: null, startDate: null }]
    store.itinerary.agendaItems = [{ id: '9', title: 'Museum', coordinates: null, files: [] } as never]

    await store.updateItinerary()
    const body = wireBody()
    expect(body.bookings[0]).toMatchObject({ remarks: null, price: null, nights: null, startDate: null })
    expect(body.agendaItems[0]).toHaveProperty('coordinates', null)
  })

  it('reports an itinerary error on a non-200 response', async () => {
    http.post.mockRejectedValue({ status: 500, response: { status: 500, data: {} } })
    const store = useItineraryStore()
    store.setSessionId('sess-1')
    const res = await store.updateItinerary()
    expect(res.isSuccess).toBe(false)
    expect(res.error).toBe('itinerary')
  })
})

describe('itinerary store — assignItemDay', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('unscheduling sends date as an empty string (not undefined) so it survives JSON', () => {
    const store = useItineraryStore()
    const item = store.addQuickAgendaItem('Museum', { day: 2, date: '2026-12-02' })
    store.assignItemDay(item, undefined, undefined)

    const updated = store.itinerary.agendaItems[0]
    expect(updated.date).toBe('')
    expect(updated.day).toBeUndefined()
    expect(JSON.parse(JSON.stringify(updated))).toHaveProperty('date', '')
  })

  it('scheduling sets date and day', () => {
    const store = useItineraryStore()
    const item = store.addQuickAgendaItem('Museum')
    store.assignItemDay(item, '2026-12-03', 3)
    expect(store.itinerary.agendaItems[0]).toMatchObject({ date: '2026-12-03', day: 3 })
  })

  it('marks persisted items dirty and queues them for update', () => {
    const store = useItineraryStore()
    store.itinerary.agendaItems = [{ id: '42', _localIndex: 'l1', title: 'Saved', date: '2026-12-01', day: 1, files: [] } as never]
    store.itinerary._agendaIdsToUpdate = []
    store.assignItemDay(store.itinerary.agendaItems[0], undefined, undefined)

    expect(store.itinerary.agendaItems[0]._isDirty).toBe(true)
    expect(store.itinerary._agendaIdsToUpdate).toEqual(['42'])
    expect(store.itinerary.agendaItems[0].date).toBe('')
  })

  it('does nothing for an unknown item', () => {
    const store = useItineraryStore()
    store.addQuickAgendaItem('Museum', { day: 1, date: '2026-12-01' })
    store.assignItemDay({ _localIndex: 'nope', title: 'x' } as never, undefined, undefined)
    expect(store.itinerary.agendaItems[0].date).toBe('2026-12-01')
  })
})
