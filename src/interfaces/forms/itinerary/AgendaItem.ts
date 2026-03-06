import type { FileWithPreview } from './FileWithPreview'

interface AgendaItem {
  id?: string
  _localIndex?: string
  category?: string
  title: string
  desc?: string
  cityRaw?: string[]
  city?: string
  durationTimingRaw?: string[]
  startTime?: number
  endTime?: number
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
