import type { Ref, ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'

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
  const { t } = useI18n()
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
    const headers = [
      t('travel.export.day'), t('travel.export.date'), t('travel.export.title'),
      t('travel.export.category'), t('travel.export.startTime'), t('travel.export.endTime'),
      t('travel.export.city'), t('travel.export.budget'), t('travel.export.description'),
    ]
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

  const exportICS = (): void => {
    if (!itinerary.value) return

    const pad = (n: number) => String(n).padStart(2, '0')

    const dtstamp = (() => {
      const now = new Date()
      return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
    })()

    // Fold long lines per RFC 5545 (max 75 octets, continuation with CRLF + space)
    const fold = (line: string): string => {
      const out: string[] = []
      while (line.length > 75) {
        out.push(line.slice(0, 75))
        line = ' ' + line.slice(75)
      }
      out.push(line)
      return out.join('\r\n')
    }

    const escText = (s: string) =>
      s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

    const events: string[] = []

    groupedByDate.value.forEach((group) => {
      if (group.date === '__tbc__' || !group.date) return

      // Parse YYYY-MM-DD
      const [y, m, d] = group.date.split('-').map(Number)
      const dateStr = `${y}${pad(m)}${pad(d)}`

      group.items.forEach((item, idx) => {
        const unknownTime = item.unknownTime ?? item.unknown_time
        const startRaw = item.startTime ?? item.start_time
        const endRaw = item.endTime ?? item.end_time

        let dtstart: string
        let dtend: string

        if (!unknownTime && startRaw) {
          // Timed event — startRaw is "HH:mm"
          const [sh, sm] = String(startRaw).split(':').map(Number)
          dtstart = `${dateStr}T${pad(sh)}${pad(sm)}00`

          if (endRaw) {
            const [eh, em] = String(endRaw).split(':').map(Number)
            dtend = `${dateStr}T${pad(eh)}${pad(em)}00`
          } else {
            // Default 1-hour duration
            const endH = sh + 1
            dtend = endH < 24
              ? `${dateStr}T${pad(endH)}${pad(sm)}00`
              : `${dateStr}T235900`
          }
        } else {
          // All-day event — DTEND is exclusive so use next calendar day
          const nextDay = new Date(y, m - 1, d + 1)
          dtstart = dateStr
          dtend = `${nextDay.getFullYear()}${pad(nextDay.getMonth() + 1)}${pad(nextDay.getDate())}`
        }

        const uid = `${group.date}-${idx}-${(item.id ?? item._localIndex ?? Math.random().toString(36).slice(2))}@fndom`
        const summary = escText(item.title || 'Untitled')
        const city = getCityFn(item)

        const lines: string[] = ['BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${dtstamp}`]

        if (!unknownTime && startRaw) {
          lines.push(`DTSTART:${dtstart}`, `DTEND:${dtend}`)
        } else {
          lines.push(`DTSTART;VALUE=DATE:${dtstart}`, `DTEND;VALUE=DATE:${dtend}`)
        }

        lines.push(fold(`SUMMARY:${summary}`))
        if (item.desc) lines.push(fold(`DESCRIPTION:${escText(item.desc)}`))
        if (city) lines.push(fold(`LOCATION:${escText(city)}`))
        if (item.category) lines.push(`CATEGORIES:${escText(item.category)}`)
        lines.push('END:VEVENT')

        events.push(lines.join('\r\n'))
      })
    })

    const calName = escText(itinerary.value.sessionTitle || 'Itinerary')
    const cal = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//fndom//Travel Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calName}`,
      ...events,
      'END:VCALENDAR',
    ].join('\r\n')

    const slug = (itinerary.value.sessionTitle || 'itinerary').replace(/\s+/g, '-').toLowerCase()
    triggerDownload(cal, `${slug}.ics`, 'text/calendar')
  }

  return { exportJSON, exportCSV, exportICS }
}
