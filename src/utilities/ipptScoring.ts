export type AgeBand = 'young' | 'mid' | 'senior'
export type TierKey = 'gold' | 'silver' | 'pass' | 'fail'

export interface Tier { name: string; key: TierKey; color: string }

const PUSHUP_TABLE: Record<AgeBand, [number, number][]> = {
  young:  [[60,25],[55,23],[50,21],[45,19],[42,17],[39,15],[36,13],[33,11],[30,9],[27,7],[24,5],[20,3],[16,1]],
  mid:    [[55,25],[50,23],[45,21],[40,19],[37,17],[34,15],[31,13],[28,11],[25,9],[22,7],[19,5],[15,3],[12,1]],
  senior: [[50,25],[45,23],[40,21],[35,19],[32,17],[29,15],[26,13],[23,11],[20,9],[17,7],[14,5],[11,3],[8,1]],
}
const SITUP_TABLE: Record<AgeBand, [number, number][]> = {
  young:  [[60,25],[55,23],[50,21],[45,19],[42,17],[39,15],[36,13],[33,11],[30,9],[27,7],[24,5],[20,3],[16,1]],
  mid:    [[55,25],[50,23],[45,21],[40,19],[37,17],[34,15],[31,13],[28,11],[25,9],[22,7],[19,5],[15,3],[12,1]],
  senior: [[50,25],[45,23],[40,21],[35,19],[32,17],[29,15],[26,13],[23,11],[20,9],[17,7],[14,5],[11,3],[8,1]],
}
const RUN_TABLE: Record<AgeBand, [number, number][]> = {
  young:  [[570,50],[600,47],[630,44],[660,41],[690,38],[720,35],[750,32],[780,29],[810,25],[840,21],[870,17],[900,13],[930,9],[960,5],[990,1]],
  mid:    [[600,50],[630,47],[660,44],[690,41],[720,38],[750,35],[780,32],[810,29],[840,25],[870,21],[900,17],[930,13],[960,9],[990,5],[1020,1]],
  senior: [[630,50],[660,47],[690,44],[720,41],[750,38],[780,35],[810,32],[840,29],[870,25],[900,21],[930,17],[960,13],[990,9],[1020,5],[1050,1]],
}

export function scoreReps(reps: number, band: AgeBand, station: 'push' | 'sit'): number {
  const table = station === 'push' ? PUSHUP_TABLE[band] : SITUP_TABLE[band]
  for (const [r, p] of table) if (reps >= r) return p
  return 0
}
export function scoreRun(seconds: number, band: AgeBand): number {
  for (const [s, p] of RUN_TABLE[band]) if (seconds <= s) return p
  return 0
}
export function ageBand(age: number): AgeBand {
  if (age <= 30) return 'young'
  if (age <= 40) return 'mid'
  return 'senior'
}
export function tierOf(total: number): Tier {
  if (total >= 85) return { name: 'GOLD + INCENTIVE', key: 'gold', color: '#C9A227' }
  if (total >= 75) return { name: 'GOLD', key: 'gold', color: '#C9A227' }
  if (total >= 61) return { name: 'SILVER', key: 'silver', color: '#8A8A8A' }
  if (total >= 51) return { name: 'PASS', key: 'pass', color: '#3B8C5A' }
  return { name: 'FAIL', key: 'fail', color: '#9E9E9E' }
}
export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
export function nextTierInfo(total: number): { threshold: number; name: string } | null {
  if (total < 51) return { threshold: 51, name: 'PASS' }
  if (total < 61) return { threshold: 61, name: 'SILVER' }
  if (total < 75) return { threshold: 75, name: 'GOLD' }
  if (total < 85) return { threshold: 85, name: 'GOLD + INCENTIVE' }
  return null
}
export { PUSHUP_TABLE, SITUP_TABLE, RUN_TABLE }
