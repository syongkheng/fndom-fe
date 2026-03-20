import type { FileWithPreview } from './FileWithPreview'

interface AgendaItem {
  id?: string
  _localIndex?: string
  category?: string
  title: string
  desc?: string
  cityRaw?: string[]
  city?: string
  coordinates?: { lat: number; lng: number }
  placeDisplay?: string
  durationTimingRaw?: string[]
  startTime?: string
  endTime?: string
  durationInHours?: number
  unknownTime: boolean
  files: FileWithPreview[]
  budget?: number
  day?: number
  date?: string
  _fileIdsToDelete: string[]
  _fileIdsToInsert: string[]
  _agendaToFileMapping: string[]
}

export type { AgendaItem }
