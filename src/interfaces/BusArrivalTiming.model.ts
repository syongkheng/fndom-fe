interface NextBusRecord {
  OriginCode: string
  DestinationCode: string
  EstimatedArrival: string
  Monitored: number
  Latitude: string
  Longitude: string
  VisitNumber: number
  Load: string
  Feature: string
  Type: string
}

interface BusArrivalService {
  ServiceNo: string
  Operator: string
  NextBus: NextBusRecord
  NextBus2: NextBusRecord
  NextBus3: NextBusRecord
}

export type { BusArrivalService, NextBusRecord }
