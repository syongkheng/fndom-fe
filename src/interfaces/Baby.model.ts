export type DiaperLoadLevel = 'light' | 'medium' | 'heavy'

// Raw snake_case shape returned directly by GET/POST /v1/ss/baby/feeding (no Dto mapping in this module)
export interface BabyFeedingRecord {
  id: number
  timing: string
  qty: string
  record_status: string
  created_dt: number
  created_by_id: number
  updated_dt: number | null
  updated_by_id: number | null
}

// Raw snake_case shape returned directly by GET/POST /v1/ss/baby/diaper
export interface BabyDiaperRecord {
  id: number
  changed_dt: number
  has_stool: boolean | 0 | 1
  has_urine: boolean | 0 | 1
  stool_load: DiaperLoadLevel | null
  urine_load: DiaperLoadLevel | null
  record_status: string
  created_dt: number
  created_by_id: number
  updated_dt: number | null
  updated_by_id: number | null
}

// Request payload for POST /v1/ss/baby/diaper
export interface LogDiaperChangePayload {
  changedAt: number
  hasStool: boolean
  hasUrine: boolean
  stoolLoad?: DiaperLoadLevel
  urineLoad?: DiaperLoadLevel
}

// Request payload for POST /v1/ss/baby/feeding
export interface LogFeedingPayload {
  timing: string
  qty: string
}
