import type { AgendaItem } from './AgendaItem'
import type { ItineraryBooking } from './ItineraryBooking'
import type { PackingItem } from './PackingItem'

interface Itinerary {
  id: string | undefined
  idempotencyKey: string
  sessionTitle: string
  sessionId: string
  country?: string
  shortCode?: string
  destinationRaw: string[]
  destination?: string
  numberOfPax?: number
  paxNames?: string[]
  itineraryDateRaw?: string[]
  startDate?: number
  endDate?: number
  unknownDate: boolean
  durationInDays: number
  challenge?: string
  agendaItems: AgendaItem[]
  bookings: ItineraryBooking[]
  packingItems: PackingItem[]
  _agendaIdsToDelete?: string[]
  _agendaIdsToUpdate?: string[]
  _bookingIdsToDelete?: number[]
  _packingIdsToDelete?: string[]
}

export type { Itinerary }
