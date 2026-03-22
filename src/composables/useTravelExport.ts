import type { Ref, ComputedRef } from 'vue'

interface AgendaRow {
  id?: string | number
  category?: string
  title?: string
  desc?: string | null
  city?: string | null
  cityRaw?: string[] | null
  city_raw?: string | null
  startTime?: string | number | null
  start_time?: string | number | null
  endTime?: string | number | null
  end_time?: string | number | null
  unknownTime?: boolean | number | null
  unknown_time?: boolean | number | null
  date?: string | null
  budget?: number | null
  [key: string]: any
}

interface DayGroup {
  date: string
  items: AgendaRow[]
  dayNumber: number | null
}

interface ItineraryData {
  sessionTitle?: string
  destination?: string
  startDate?: number
  endDate?: number
  numberOfPax?: number
  agendaItems?: AgendaRow[]
  [key: string]: any
}

const triggerDownload = (content: string, filename: string, mime: string): void => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useTravelExport(
  itinerary: Ref<ItineraryData | null>,
  groupedByDate: ComputedRef<DayGroup[]>,
  getCityFn: (item: AgendaRow) => string | null,
) {
  const exportJSON = (): void => {
    if (!itinerary.value) return
    const data = {
      title: itinerary.value.sessionTitle,
      destination: itinerary.value.destination ?? null,
      startDate: itinerary.value.startDate ?? null,
      endDate: itinerary.value.endDate ?? null,
      numberOfPax: itinerary.value.numberOfPax ?? null,
      days: groupedByDate.value.map((group) => ({
        date: group.date === '__tbc__' ? null : group.date,
        dayNumber: group.dayNumber,
        items: group.items.map((item) => ({
          title: item.title,
          category: item.category ?? null,
          desc: item.desc ?? null,
          city: getCityFn(item) ?? null,
          startTime: (item.startTime ?? item.start_time) ?? null,
          endTime: (item.endTime ?? item.end_time) ?? null,
          budget: item.budget ?? null,
        })),
      })),
    }
    const slug = (itinerary.value.sessionTitle || 'itinerary').replace(/\s+/g, '-').toLowerCase()
    triggerDownload(JSON.stringify(data, null, 2), `${slug}.json`, 'application/json')
  }

  const exportCSV = (): void => {
    if (!itinerary.value) return
    const headers = ['Day', 'Date', 'Title', 'Category', 'Start Time', 'End Time', 'City', 'Budget', 'Description']
    const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = groupedByDate.value.flatMap((group) =>
      group.items.map((item) =>
        [
          q(group.dayNumber ?? ''),
          q(group.date === '__tbc__' ? '' : group.date),
          q(item.title),
          q(item.category ?? ''),
          q(item.startTime ?? item.start_time ?? ''),
          q((item.endTime ?? item.end_time) ?? ''),
          q(getCityFn(item) ?? ''),
          q(item.budget ?? ''),
          q(item.desc ?? ''),
        ].join(',')
      )
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const slug = (itinerary.value.sessionTitle || 'itinerary').replace(/\s+/g, '-').toLowerCase()
    triggerDownload(csv, `${slug}.csv`, 'text/csv')
  }

  return { exportJSON, exportCSV }
}
