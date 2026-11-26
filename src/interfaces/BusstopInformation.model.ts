interface BusstopInformation {
  busStopCode: string
  roadName: string
  description: string
  /** Whole metres from the searched point. */
  distanceM: number
}

export type { BusstopInformation }
