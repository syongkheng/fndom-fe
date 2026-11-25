/** One bus service at a stop (`GET /lta/bus/services` → `data.services[]`). Times are "HHmm" strings, "-" = no service. */
interface BusRouteInformation {
  serviceNo: string
  operator: string
  direction: string
  stopSequence: string
  distance: string
  weekdayFirstBus: string
  weekdayLastBus: string
  saturdayFirstBus: string
  saturdayLastBus: string
  sundayFirstBus: string
  sundayLastBus: string
}

export type { BusRouteInformation }
