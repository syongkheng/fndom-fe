export interface ItineraryBooking {
  id?: number
  _localIndex?: string
  itineraryId?: number
  category?: 'flight' | 'accommodation' | 'transport' | 'other'
  item: string
  // null = cleared. The GET returns null for unset columns, and a cleared field must be sent as
  // null/"" (undefined is dropped from the JSON, which qindom reads as "unchanged").
  remarks?: string | null
  link?: string | null
  payment?: string | null
  startDate?: string | null
  endDate?: string | null
  nights?: number | null
  price?: number | null
  booked?: boolean
  freeCancellation?: string | null
  breakfast?: boolean
  deposit?: string | null
  paxBreakdown?: Record<string, number>
  sortOrder?: number
}
