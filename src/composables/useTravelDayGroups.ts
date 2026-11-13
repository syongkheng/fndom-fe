import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { i18n } from '@/i18n'

const t = (key: string, values?: Record<string, unknown>) => i18n.global.t(key, values ?? {})

// Minimal shape needed by the composable — compatible with both AgendaItem
// (planner) and AgendaRow (viewer). Exported so callers can type their helpers.
export interface AgendaRow {
  id?: string | number
  _localIndex?: string
  date?: string | null
  day?: number | null
  startTime?: string | number | null
  start_time?: string | number | null
  unknownTime?: boolean | number | null
  unknown_time?: boolean | number | null
  [key: string]: any
}

// What the composable needs to know about the trip to turn dates into day
// numbers. `startKey` is the trip's first day as a local YYYY-MM-DD key.
export interface DayGroupContext {
  startKey?: string
  durationInDays?: number
}

export const TBC_KEY = '__tbc__'
const DAY_KEY_PREFIX = '__day_'
const DAY_MS = 86_400_000

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const toLocalDateKey = (date: any): string => {
  if (!date) return TBC_KEY
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const d = new Date(date)
  if (isNaN(d.getTime())) return TBC_KEY
  return keyOf(d)
}

const parseKey = (key: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0)
}

// Local YYYY-MM-DD key of trip day `n` (1-based) given the trip's start key.
export const dateKeyForDay = (startKey: string, n: number): string | undefined => {
  const start = parseKey(startKey)
  if (!start || n < 1) return undefined
  start.setDate(start.getDate() + n - 1)
  return keyOf(start)
}

// 1-based trip day for a date key, relative to the trip's start key. May be
// < 1 or > duration when the date falls outside the trip.
export const dayForDateKey = (dateKey: string, startKey: string): number | undefined => {
  const d = parseKey(dateKey)
  const s = parseKey(startKey)
  if (!d || !s) return undefined
  return Math.round((d.getTime() - s.getTime()) / DAY_MS) + 1
}

// Trip start as a local date key. Prefers the raw picker value (already a
// YYYY-MM-DD string when set from the planner header) and falls back to the
// stored timestamp. `raw` may be an array or the JSON string the API returns.
export const resolveStartKey = (raw: unknown, startDate?: number | null): string | undefined => {
  let arr: unknown = raw
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw) } catch { arr = undefined }
  }
  const first = Array.isArray(arr) ? arr[0] : undefined
  if (typeof first === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(first)) return first
  if (startDate) return toLocalDateKey(startDate)
  if (typeof first === 'string') {
    const k = toLocalDateKey(first)
    return k === TBC_KEY ? undefined : k
  }
  return undefined
}

export const dayGroupKey = (n: number) => `${DAY_KEY_PREFIX}${n}`

const formatDate = (dateKey: string): string => {
  if (dateKey === TBC_KEY) return t('travel.dayGroups.tbc')
  if (dateKey.startsWith(DAY_KEY_PREFIX)) return t('travel.dayGroups.dayOnly', { n: dateKey.slice(DAY_KEY_PREFIX.length) })
  const d = new Date(`${dateKey}T12:00:00`)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export const formatShortDate = (dateKey: string): string => {
  const d = new Date(`${dateKey}T12:00:00`)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

const formatHeaderRange = (startDate?: number, endDate?: number): string | null => {
  if (!startDate) return null
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return endDate ? `${fmt(startDate)} – ${fmt(endDate)}` : fmt(startDate)
}

export const getItemTimeMinutes = (item: AgendaRow): number => {
  const unknown = item.unknownTime ?? item.unknown_time
  const st = item.startTime ?? item.start_time
  if (unknown || !st || typeof st !== 'string') return Infinity
  const [h, m] = st.split(':').map(Number)
  return isNaN(h) || isNaN(m) ? Infinity : h * 60 + m
}

export const sortByTime = <T extends AgendaRow>(items: T[]): T[] =>
  [...items].sort((a, b) => {
    const ta = getItemTimeMinutes(a)
    const tb = getItemTimeMinutes(b)
    if (ta !== tb) return ta - tb
    return (Number(a.id) || 0) - (Number(b.id) || 0)
  })

export interface DayGroup<T extends AgendaRow = AgendaRow> {
  date: string
  items: T[]
  dayNumber: number | null
}

export function useTravelDayGroups<T extends AgendaRow = AgendaRow>(
  items: Ref<T[]> | ComputedRef<T[]>,
  ctx?: Ref<DayGroupContext> | ComputedRef<DayGroupContext>,
) {
  const collapsedDays = ref(new Set<string>())

  const toggleDay = (key: string) => {
    if (collapsedDays.value.has(key)) {
      collapsedDays.value.delete(key)
    } else {
      collapsedDays.value.add(key)
    }
    collapsedDays.value = new Set(collapsedDays.value)
  }

  // Legacy fallback: trips without a start date whose items carry calendar
  // dates get Day 1..k from their distinct sorted dates (the old behaviour).
  const legacyDayMap = computed(() => {
    const keys = [...new Set(items.value.map((i) => toLocalDateKey(i.date)))]
      .filter((k) => k !== TBC_KEY)
      .sort()
    return new Map(keys.map((k, i) => [k, i + 1]))
  })

  // Resolved 1-based trip day for an item, or undefined when unscheduled.
  // An explicit `day` wins; otherwise the date is measured from the trip start.
  const dayOf = (item: AgendaRow): number | undefined => {
    if (item.day != null && Number(item.day) > 0) return Number(item.day)
    const dateKey = toLocalDateKey(item.date)
    if (dateKey === TBC_KEY) return undefined
    const startKey = ctx?.value.startKey
    if (startKey) return dayForDateKey(dateKey, startKey)
    return legacyDayMap.value.get(dateKey)
  }

  const groupedByDate = computed<DayGroup<T>[]>(() => {
    const list = items.value
    if (!list?.length) return []

    const startKey = ctx?.value.startKey
    const map = new Map<string, { items: T[]; dayNumber: number | null }>()

    for (const item of list) {
      const day = dayOf(item)
      let key: string
      if (day === undefined) {
        key = TBC_KEY
      } else {
        const dateKey = toLocalDateKey(item.date)
        const fromDay = startKey ? dateKeyForDay(startKey, day) : undefined
        key = dateKey !== TBC_KEY ? dateKey : (fromDay ?? dayGroupKey(day))
      }
      if (!map.has(key)) map.set(key, { items: [], dayNumber: day ?? null })
      map.get(key)!.items.push(item)
    }

    return Array.from(map.entries())
      .map(([date, g]) => ({ date, items: sortByTime(g.items), dayNumber: g.dayNumber }))
      .sort((a, b) => {
        const da = a.dayNumber ?? Infinity
        const db = b.dayNumber ?? Infinity
        if (da !== db) return da - db
        return a.date.localeCompare(b.date)
      })
  })

  const allCollapsed = computed(() =>
    groupedByDate.value.length > 0 &&
    groupedByDate.value.every(g => collapsedDays.value.has(g.date))
  )

  const collapseAll = () => {
    collapsedDays.value = new Set(groupedByDate.value.map(g => g.date))
  }

  const expandAll = () => {
    collapsedDays.value = new Set()
  }

  return {
    toLocalDateKey,
    formatDate,
    formatHeaderRange,
    dayOf,
    groupedByDate,
    collapsedDays,
    toggleDay,
    allCollapsed,
    collapseAll,
    expandAll,
  }
}
