import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'

// Minimal shape needed by the composable — compatible with both AgendaItem
// (planner) and AgendaRow (viewer). Exported so callers can type their helpers.
export interface AgendaRow {
  id?: string | number
  _localIndex?: string
  date?: string | null
  startTime?: string | number | null
  start_time?: string | number | null
  unknownTime?: boolean | number | null
  unknown_time?: boolean | number | null
  [key: string]: any
}

const toLocalDateKey = (date: any): string => {
  if (!date) return '__tbc__'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '__tbc__'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatDate = (dateKey: string): string => {
  if (dateKey === '__tbc__') return 'Date TBC'
  const d = new Date(`${dateKey}T12:00:00`)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const formatHeaderRange = (startDate?: number, endDate?: number): string | null => {
  if (!startDate) return null
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return endDate ? `${fmt(startDate)} – ${fmt(endDate)}` : fmt(startDate)
}

const getItemTimeMinutes = (item: AgendaRow): number => {
  const unknown = item.unknownTime ?? item.unknown_time
  const st = item.startTime ?? item.start_time
  if (unknown || !st || typeof st !== 'string') return Infinity
  const [h, m] = st.split(':').map(Number)
  return isNaN(h) || isNaN(m) ? Infinity : h * 60 + m
}

export function useTravelDayGroups(items: Ref<AgendaRow[]> | ComputedRef<AgendaRow[]>) {
  const collapsedDays = ref(new Set<string>())

  const toggleDay = (key: string) => {
    if (collapsedDays.value.has(key)) {
      collapsedDays.value.delete(key)
    } else {
      collapsedDays.value.add(key)
    }
    collapsedDays.value = new Set(collapsedDays.value)
  }

  const groupedByDate = computed(() => {
    const list = items.value
    if (!list?.length) return []

    const sorted = [...list].sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(a.date as any).getTime() - new Date(b.date as any).getTime()
    })

    const map = new Map<string, AgendaRow[]>()
    for (const item of sorted) {
      const key = toLocalDateKey(item.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }

    map.forEach((dayItems) => {
      dayItems.sort((a, b) => {
        const ta = getItemTimeMinutes(a)
        const tb = getItemTimeMinutes(b)
        if (ta !== tb) return ta - tb
        return (Number(a.id) || 0) - (Number(b.id) || 0)
      })
    })

    let dayNumber = 0
    return Array.from(map.entries()).map(([date, dayItems]) => {
      const isTbc = date === '__tbc__'
      if (!isTbc) dayNumber++
      return { date, items: dayItems, dayNumber: isTbc ? null : dayNumber }
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
    groupedByDate,
    collapsedDays,
    toggleDay,
    allCollapsed,
    collapseAll,
    expandAll,
  }
}
