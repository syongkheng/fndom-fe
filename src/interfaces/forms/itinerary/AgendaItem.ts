import type { FileWithPreview } from './FileWithPreview'

interface FileInsertPayload {
  uuid: string
  tgShortCode: string
  mimeType: string
  name?: string
  sizeInBytes?: number
}

interface AgendaItem {
  id?: string
  _localIndex?: string
  category?: string
  // Discriminates Things-to-do vs Places-to-visit now that both can carry
  // coordinates — items loaded from the backend may come back as
  // `list_type` (snake_case, see Itinerary.service.ts); read both.
  listType?: 'todo' | 'place'
  list_type?: 'todo' | 'place'
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
  _filesToInsert: FileInsertPayload[]
  _agendaToFileMapping: string[]
  _isDirty?: boolean
}

export type { AgendaItem, FileInsertPayload }
