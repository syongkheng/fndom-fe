interface BusRouteInformation {
  direction: string
  distance: string
  operator: string
  sat_first_bus: string
  sat_last_bus: string
  service_no: string
  stop_sequence: string
  sun_first_bus: string
  sun_last_bus: string
  wd_first_bus: string
  wd_last_bus: string
}

export type { BusRouteInformation }
