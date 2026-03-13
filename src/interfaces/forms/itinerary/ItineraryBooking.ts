export interface ItineraryBooking {
  id?: number
  _localIndex?: string
  itineraryId?: number
  category?: 'flight' | 'accommodation' | 'transport' | 'other'
  item: string
  remarks?: string
  link?: string
  payment?: string
  startDate?: string
  endDate?: string
  nights?: number
  price?: number
  booked?: boolean
  freeCancellation?: string
  breakfast?: boolean
  deposit?: string
  paxBreakdown?: Record<string, number>
  sortOrder?: number
}
