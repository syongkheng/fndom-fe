export interface GarminSleep {
  score: number | null
  durationMin: number | null
  deepMin: number | null
  lightMin: number | null
  remMin: number | null
  awakeMin: number | null
  restingHr: number | null
}

export interface GarminHighStressWindow {
  start: number
  end: number
}

export interface GarminIntradayPoint {
  recordedDt: number
  stressScore: number | null
  bodyBattery: number | null
  heartRate: number | null
}

export interface GarminToday {
  date: string
  sleep: GarminSleep | null
  intraday: GarminIntradayPoint[]
  currentStress: number | null
  currentBodyBattery: number | null
  highStressWindows: GarminHighStressWindow[]
}

export interface GarminDailySummary {
  date: string
  sleepScore: number | null
  sleepDurationMin: number | null
  avgStress: number | null
  maxStress: number | null
  highStressMinutes: number
  minBodyBattery: number | null
  restingHr: number | null
}
