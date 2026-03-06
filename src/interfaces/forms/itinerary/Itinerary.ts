import type { AgendaItem } from './AgendaItem'

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
  itineraryDateRaw?: string[]
  startDate?: number
  endDate?: number
  unknownDate: boolean
  durationInDays: number
  challenge?: string
  agendaItems: AgendaItem[]
  _agendaIdsToDelete?: string[]
  _agendaIdsToUpdate?: string[]
}

export type { Itinerary }
