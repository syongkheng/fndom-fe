import type { AgendaItem } from './AgendaItem'
import type { ItineraryBooking } from './ItineraryBooking'
import type { PackingItem } from './PackingItem'
import type { NoteItem } from './NoteItem'

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
  /** null = remove the access code on save (undefined is dropped from the JSON and keeps it). */
  challenge?: string | null
  agendaItems: AgendaItem[]
  bookings: ItineraryBooking[]
  packingItems: PackingItem[]
  noteItems: NoteItem[]
  _agendaIdsToDelete?: string[]
  _agendaIdsToUpdate?: string[]
  _bookingIdsToDelete?: number[]
  _packingIdsToDelete?: string[]
  _noteIdsToDelete?: string[]
}

export type { Itinerary }
