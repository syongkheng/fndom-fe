<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { ElMessage } from 'element-plus'
import { getLunarInfo } from '@/utilities/lunarCalendar'

type EventCategory = 'venue' | 'catering' | 'attire' | 'ceremony' | 'admin' | 'other'
type EventStatus = 'pending' | 'done'
type RsvpStatus = 'pending' | 'accepted' | 'declined'
type GuestGroup = 'bride' | 'groom' | 'mutual'

interface WeddingEvent {
  id: number
  title: string
  date: string
  category: EventCategory
  status: EventStatus
  notes: string | null
}

interface WeddingGuest {
  id: number
  name: string
  group: GuestGroup
  rsvp: RsvpStatus
  plusOne: boolean
  dietaryNotes: string | null
  tableId: number | null
  seatNumber: number | null
}

interface WeddingTable {
  id: number
  name: string
  capacity: number
}

// ── State ─────────────────────────────────────────────────────────────────────

const loading = ref(false)
const events = ref<WeddingEvent[]>([])
const tables = ref<WeddingTable[]>([])
const guests = ref<WeddingGuest[]>([])

// ── Data Fetching ─────────────────────────────────────────────────────────────

async function fetchAll() {
  loading.value = true
  try {
    const [eventsRes, tablesRes, guestsRes] = await Promise.all([
      HttpClient.get(ApiRoute.WEDDING.EVENTS_GET_ALL),
      HttpClient.get(ApiRoute.WEDDING.TABLES_GET_ALL),
      HttpClient.get(ApiRoute.WEDDING.GUESTS_GET_ALL),
    ])
    events.value = eventsRes.data.data ?? []
    tables.value = tablesRes.data.data ?? []
    guests.value = guestsRes.data.data ?? []
  } catch {
    ElMessage.error('Failed to load wedding data')
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

// ── Events Tab ───────────────────────────────────────────────────────────────

const eventFilter = ref<'all' | EventStatus>('all')
const confirmDeleteEventId = ref<number | null>(null)
const showAddEventDialog = ref(false)
const addEventForm = ref({ title: '', date: '', category: 'venue' as EventCategory, notes: '' })

const today = new Date().toISOString().slice(0, 10)

const filteredEvents = computed(() => {
  const base = eventFilter.value === 'all'
    ? [...events.value]
    : events.value.filter(e => e.status === eventFilter.value)

  return base.sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (a.status !== 'done' && b.status === 'done') return -1
    return a.date.localeCompare(b.date)
  })
})

const eventDoneCount = computed(() => events.value.filter(e => e.status === 'done').length)

async function toggleEventStatus(event: WeddingEvent) {
  const newStatus: EventStatus = event.status === 'done' ? 'pending' : 'done'
  try {
    await HttpClient.post(ApiRoute.WEDDING.EVENTS_UPDATE, { id: event.id, status: newStatus })
    event.status = newStatus
  } catch {
    ElMessage.error('Failed to update event')
  }
}

async function deleteEvent(id: number) {
  try {
    await HttpClient.post(ApiRoute.WEDDING.EVENTS_DELETE, { id })
    events.value = events.value.filter(e => e.id !== id)
    confirmDeleteEventId.value = null
  } catch {
    ElMessage.error('Failed to delete event')
  }
}

async function addEvent() {
  if (!addEventForm.value.title.trim() || !addEventForm.value.date) return
  try {
    const { data } = await HttpClient.post(ApiRoute.WEDDING.EVENTS_CREATE, {
      title: addEventForm.value.title.trim(),
      date: addEventForm.value.date,
      category: addEventForm.value.category,
      notes: addEventForm.value.notes.trim() || null,
    })
    events.value.push(data.data)
    showAddEventDialog.value = false
    addEventForm.value = { title: '', date: '', category: 'venue', notes: '' }
  } catch {
    ElMessage.error('Failed to add event')
  }
}

function dateBadgeClass(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000)
  if (diff < 0) return 'date-badge--past'
  if (diff <= 7) return 'date-badge--soon'
  if (diff <= 30) return 'date-badge--upcoming'
  return 'date-badge--future'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  venue: '#6366f1',
  catering: '#f59e0b',
  attire: '#ec4899',
  ceremony: '#10b981',
  admin: '#64748b',
  other: '#94a3b8',
}

// ── Guests Tab ───────────────────────────────────────────────────────────────

const guestFilter = ref<'all' | GuestGroup>('all')
const showAddGuestDialog = ref(false)
const addGuestForm = ref({ name: '', group: 'mutual' as GuestGroup, plusOne: false, dietaryNotes: '' })

const guestGroupOptions = [
  { label: 'All', value: 'all' },
  { label: "Bride's Side", value: 'bride' },
  { label: "Groom's Side", value: 'groom' },
  { label: 'Mutual', value: 'mutual' },
]

const filteredGuests = computed(() => {
  if (guestFilter.value === 'all') return guests.value
  return guests.value.filter(g => g.group === guestFilter.value)
})

const acceptedCount = computed(() => guests.value.filter(g => g.rsvp === 'accepted').length)
const declinedCount = computed(() => guests.value.filter(g => g.rsvp === 'declined').length)
const pendingCount = computed(() => guests.value.filter(g => g.rsvp === 'pending').length)
const plusOneCount = computed(() => guests.value.filter(g => g.plusOne).length)
const totalGuests = computed(() => guests.value.length)

const acceptedPct = computed(() => Math.round((acceptedCount.value / totalGuests.value) * 100))
const declinedPct = computed(() => Math.round((declinedCount.value / totalGuests.value) * 100))
const pendingPct = computed(() => 100 - acceptedPct.value - declinedPct.value)

async function setRsvp(guest: WeddingGuest, status: RsvpStatus) {
  try {
    await HttpClient.post(ApiRoute.WEDDING.GUESTS_UPDATE, { id: guest.id, rsvp: status })
    guest.rsvp = status
  } catch {
    ElMessage.error('Failed to update RSVP')
  }
}

async function addGuest() {
  if (!addGuestForm.value.name.trim()) return
  try {
    const { data } = await HttpClient.post(ApiRoute.WEDDING.GUESTS_CREATE, {
      name: addGuestForm.value.name.trim(),
      group: addGuestForm.value.group,
      plusOne: addGuestForm.value.plusOne,
      dietaryNotes: addGuestForm.value.dietaryNotes.trim() || null,
    })
    guests.value.push(data.data)
    showAddGuestDialog.value = false
    addGuestForm.value = { name: '', group: 'mutual', plusOne: false, dietaryNotes: '' }
  } catch {
    ElMessage.error('Failed to add guest')
  }
}

async function onGuestTableChange(guest: WeddingGuest, tableId: number | null) {
  const prevTableId = guest.tableId
  const prevSeatNumber = guest.seatNumber
  let seatNumber: number | null = null
  if (tableId !== null) {
    const table = tables.value.find(t => t.id === tableId)
    const occupied = new Set(guests.value.filter(g => g.tableId === tableId && g.id !== guest.id).map(g => g.seatNumber))
    let seat = 1
    while (occupied.has(seat) && seat <= (table?.capacity ?? 20)) seat++
    seatNumber = seat
  }
  guest.tableId = tableId
  guest.seatNumber = seatNumber
  try {
    await HttpClient.post(ApiRoute.WEDDING.TABLES_ASSIGN, { guestId: guest.id, tableId, seatNumber })
  } catch {
    guest.tableId = prevTableId
    guest.seatNumber = prevSeatNumber
    ElMessage.error('Failed to update table assignment')
  }
}

function tableOptions(includeNone = true) {
  const opts = tables.value.map(t => ({ label: t.name, value: t.id }))
  if (includeNone) opts.unshift({ label: 'Unassigned', value: null as unknown as number })
  return opts
}

// ── Tables Tab ───────────────────────────────────────────────────────────────

const showAddTableDialog = ref(false)
const addTableForm = ref({ name: '', capacity: 8 })

const seatedCount = computed(() => guests.value.filter(g => g.tableId !== null).length)
const unassignedGuests = computed(() => guests.value.filter(g => g.tableId === null))

// ── Drag & Drop ───────────────────────────────────────────────────────────────

const draggingGuestId = ref<number | null>(null)
const dragOverZone = ref<number | 'unassigned' | null>(null)
const dragOverSeat = ref<{ tableId: number; seatIdx: number } | null>(null)

function onDragStart(e: DragEvent, guestId: number) {
  draggingGuestId.value = guestId
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragEnd() {
  draggingGuestId.value = null
  dragOverZone.value = null
  dragOverSeat.value = null
}

function onDragOver(e: DragEvent, zone: number | 'unassigned') {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  dragOverZone.value = zone
}

function onDragLeave(e: DragEvent, zone: number | 'unassigned') {
  const related = e.relatedTarget as Node | null
  if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
    if (dragOverZone.value === zone) dragOverZone.value = null
  }
}

async function onDrop(tableId: number | null) {
  if (draggingGuestId.value === null) return
  const guest = guests.value.find(g => g.id === draggingGuestId.value)
  draggingGuestId.value = null
  dragOverZone.value = null
  dragOverSeat.value = null
  if (!guest) return
  const prevTableId = guest.tableId
  const prevSeatNumber = guest.seatNumber
  let seatNumber: number | null = null
  if (tableId !== null) {
    const table = tables.value.find(t => t.id === tableId)
    const occupied = new Set(guests.value.filter(g => g.tableId === tableId && g.id !== guest.id).map(g => g.seatNumber))
    let seat = 1
    while (occupied.has(seat) && seat <= (table?.capacity ?? 20)) seat++
    seatNumber = seat
  }
  guest.tableId = tableId
  guest.seatNumber = seatNumber
  try {
    await HttpClient.post(ApiRoute.WEDDING.TABLES_ASSIGN, { guestId: guest.id, tableId, seatNumber })
  } catch {
    guest.tableId = prevTableId
    guest.seatNumber = prevSeatNumber
    ElMessage.error('Failed to update seat assignment')
  }
}

function onDragOverSeat(e: DragEvent, tableId: number, seatIdx: number) {
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer!.dropEffect = 'move'
  dragOverSeat.value = { tableId, seatIdx }
}

function onDragLeaveSeat(e: DragEvent, tableId: number, seatIdx: number) {
  const related = e.relatedTarget as Node | null
  if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
    if (dragOverSeat.value?.tableId === tableId && dragOverSeat.value.seatIdx === seatIdx)
      dragOverSeat.value = null
  }
}

async function onDropSeat(tableId: number, seatIdx: number) {
  if (draggingGuestId.value === null) return
  const guest = guests.value.find(g => g.id === draggingGuestId.value)
  draggingGuestId.value = null
  dragOverZone.value = null
  dragOverSeat.value = null
  if (!guest) return
  const prevTableId = guest.tableId
  const prevSeatNumber = guest.seatNumber
  guest.tableId = tableId
  guest.seatNumber = seatIdx + 1
  try {
    await HttpClient.post(ApiRoute.WEDDING.TABLES_ASSIGN, { guestId: guest.id, tableId, seatNumber: seatIdx + 1 })
  } catch {
    guest.tableId = prevTableId
    guest.seatNumber = prevSeatNumber
    ElMessage.error('Failed to update seat assignment')
  }
}

function guestsAtTable(tableId: number): WeddingGuest[] {
  return guests.value.filter(g => g.tableId === tableId)
}

function tableSeats(tableId: number, capacity: number): (WeddingGuest | null)[] {
  const result: (WeddingGuest | null)[] = Array(capacity).fill(null)
  for (const guest of guests.value.filter(g => g.tableId === tableId)) {
    const idx = (guest.seatNumber ?? 1) - 1
    if (idx >= 0 && idx < capacity) result[idx] = guest
  }
  return result
}

function seatStyle(idx: number, capacity: number): Record<string, string> {
  const R = 56
  const cx = 75, cy = 75
  const half = 12
  const angle = ((2 * Math.PI) / capacity) * idx - Math.PI / 2
  return {
    left: Math.round(cx + R * Math.cos(angle) - half) + 'px',
    top:  Math.round(cy + R * Math.sin(angle) - half) + 'px',
  }
}

function guestInitials(name: string): string {
  return name.trim().split(/\s+/).map(p => p[0]?.toUpperCase() ?? '').join('').slice(0, 2)
}

function tableShortName(name: string): string {
  return name.split('—')[0].trim()
}

function capacityBarPct(tableId: number, capacity: number): number {
  return Math.min(100, Math.round((guestsAtTable(tableId).length / capacity) * 100))
}

function isOverCapacity(tableId: number, capacity: number): boolean {
  return guestsAtTable(tableId).length > capacity
}

async function addTable() {
  if (!addTableForm.value.name.trim() || addTableForm.value.capacity < 1) return
  try {
    const { data } = await HttpClient.post(ApiRoute.WEDDING.TABLES_CREATE, {
      name: addTableForm.value.name.trim(),
      capacity: addTableForm.value.capacity,
    })
    tables.value.push(data.data)
    showAddTableDialog.value = false
    addTableForm.value = { name: '', capacity: 8 }
  } catch {
    ElMessage.error('Failed to add table')
  }
}

// ── Date Picker Tab ───────────────────────────────────────────────────────────

type CeremonyType = '过大礼' | '结婚' | '回门' | 'custom'
type DateStatus = 'pending' | 'accepted' | 'rejected'

interface WeddingDateComment {
  id: number
  dateId: number
  commenterName: string
  comment: string
  createdAt: number
}

interface WeddingDateEntry {
  id: number
  sessionId: number
  date: string
  ceremonyType: string
  auspiciousNotes: string | null
  status: DateStatus
  createdAt: number
  comments: WeddingDateComment[]
}

interface WeddingSession {
  id: number
  shortCode: string
  title: string
  createdAt: number
}

const sessions = ref<WeddingSession[]>([])
const expandedSessionId = ref<number | null>(null)
const expandedSessionDates = ref<WeddingDateEntry[]>([])
const sessionsLoading = ref(false)
const datesLoading = ref(false)

const showAddSessionDialog = ref(false)
const addSessionForm = ref({ title: '' })

const showAddDateDialog = ref(false)
const addDateForm = ref({ sessionId: 0, date: '', ceremonyType: '结婚' as CeremonyType, auspiciousNotes: '' })

const showCommentsDialog = ref(false)
const selectedDateComments = ref<WeddingDateComment[]>([])
const selectedDateTitle = ref('')
const activeCommentDateEntry = ref<WeddingDateEntry | null>(null)

const CEREMONY_TYPE_OPTIONS = [
  { label: '过大礼 (Betrothal)', value: '过大礼' },
  { label: '结婚 (Wedding Day)', value: '结婚' },
  { label: '回门 (Return Visit)', value: '回门' },
  { label: 'Custom', value: 'custom' },
]

const DATE_STATUS_COLORS: Record<string, string> = {
  pending:  '#f59e0b',
  accepted: '#10b981',
  rejected: '#ef4444',
}

const WEDDING_YI = ['嫁娶', '纳采', '订盟', '会亲友', '冠笄']

function getDateLunar(dateStr: string) {
  return getLunarInfo(dateStr)
}

onMounted(fetchSessions)

async function fetchSessions() {
  sessionsLoading.value = true
  try {
    const { data } = await HttpClient.get(ApiRoute.WEDDING.DATES_GET_SESSIONS)
    sessions.value = data.data.sessions ?? []
  } catch {
    ElMessage.error('Failed to load date sessions')
  } finally {
    sessionsLoading.value = false
  }
}

async function toggleSessionExpand(sessionId: number) {
  if (expandedSessionId.value === sessionId) {
    expandedSessionId.value = null
    expandedSessionDates.value = []
    return
  }
  expandedSessionId.value = sessionId
  datesLoading.value = true
  try {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return
    const { data } = await HttpClient.get(ApiRoute.WEDDING.DATES_GET_PUBLIC(session.shortCode))
    expandedSessionDates.value = data.data.session?.dates ?? []
  } catch {
    ElMessage.error('Failed to load dates')
  } finally {
    datesLoading.value = false
  }
}

async function createSession() {
  if (!addSessionForm.value.title.trim()) return
  try {
    const { data } = await HttpClient.post(ApiRoute.WEDDING.DATES_CREATE_SESSION, {
      title: addSessionForm.value.title.trim(),
    })
    sessions.value.unshift(data.data.session)
    showAddSessionDialog.value = false
    addSessionForm.value = { title: '' }
  } catch {
    ElMessage.error('Failed to create session')
  }
}

async function deleteSession(id: number) {
  try {
    await HttpClient.post(ApiRoute.WEDDING.DATES_DELETE_SESSION, { id })
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (expandedSessionId.value === id) {
      expandedSessionId.value = null
      expandedSessionDates.value = []
    }
  } catch {
    ElMessage.error('Failed to delete session')
  }
}

function openAddDateDialog(sessionId: number) {
  addDateForm.value = { sessionId, date: '', ceremonyType: '结婚', auspiciousNotes: '' }
  showAddDateDialog.value = true
}

async function addDate() {
  if (!addDateForm.value.date || !addDateForm.value.ceremonyType) return
  try {
    const { data } = await HttpClient.post(ApiRoute.WEDDING.DATES_ADD_DATE, {
      session_id:       addDateForm.value.sessionId,
      date:             addDateForm.value.date,
      ceremony_type:    addDateForm.value.ceremonyType,
      auspicious_notes: addDateForm.value.auspiciousNotes.trim() || null,
    })
    if (expandedSessionId.value === addDateForm.value.sessionId) {
      expandedSessionDates.value.push({ ...data.data.date, comments: [] })
      expandedSessionDates.value.sort((a, b) => a.date.localeCompare(b.date))
    }
    showAddDateDialog.value = false
  } catch {
    ElMessage.error('Failed to add date')
  }
}

async function updateDateStatus(entry: WeddingDateEntry, status: DateStatus) {
  const prev = entry.status
  entry.status = status
  try {
    await HttpClient.post(ApiRoute.WEDDING.DATES_UPDATE_DATE, { id: entry.id, status })
  } catch {
    entry.status = prev
    ElMessage.error('Failed to update status')
  }
}

async function deleteDate(id: number) {
  try {
    await HttpClient.post(ApiRoute.WEDDING.DATES_DELETE_DATE, { id })
    expandedSessionDates.value = expandedSessionDates.value.filter(d => d.id !== id)
  } catch {
    ElMessage.error('Failed to delete date')
  }
}

async function deleteComment(commentId: number) {
  try {
    await HttpClient.post(ApiRoute.WEDDING.DATES_DELETE_COMMENT, { id: commentId })
    if (activeCommentDateEntry.value) {
      activeCommentDateEntry.value.comments = activeCommentDateEntry.value.comments.filter(c => c.id !== commentId)
    }
    selectedDateComments.value = selectedDateComments.value.filter(c => c.id !== commentId)
  } catch {
    ElMessage.error('Failed to delete comment')
  }
}

function openComments(entry: WeddingDateEntry) {
  activeCommentDateEntry.value = entry
  selectedDateComments.value = [...entry.comments]
  selectedDateTitle.value = `${formatDate(entry.date)} — ${entry.ceremonyType}`
  showCommentsDialog.value = true
}

function copyShareLink(shortCode: string) {
  const url = `${window.location.origin}/wedding/dates/v/${shortCode}`
  navigator.clipboard.writeText(url)
    .then(() => ElMessage.success('Share link copied!'))
    .catch(() => ElMessage.error('Failed to copy link'))
}
</script>

<template>
  <div class="page-container wedding-page" v-loading="loading">
    <div class="wedding-header">
      <h1 class="wedding-title">Wedding Planner</h1>
      <p class="wedding-subtitle">Events, guests, and seating — all in one place</p>
    </div>

    <el-tabs type="border-card" class="wedding-tabs">

      <!-- ── Tab 1: Events ──────────────────────────────────────── -->
      <el-tab-pane label="Events / Timeline">
        <div class="tab-header">
          <div>
            <h2 class="tab-title">Wedding Events</h2>
            <p class="tab-subtitle">{{ eventDoneCount }} done / {{ events.length }} total</p>
          </div>
          <el-button type="primary" size="small" @click="showAddEventDialog = true">+ Add Event</el-button>
        </div>

        <!-- Filter pills -->
        <div class="filter-pills">
          <button
            v-for="opt in [{ label: 'All', value: 'all' }, { label: 'Pending', value: 'pending' }, { label: 'Done', value: 'done' }]"
            :key="opt.value"
            class="filter-pill"
            :class="{ 'filter-pill--active': eventFilter === opt.value }"
            @click="eventFilter = opt.value as 'all' | EventStatus"
          >{{ opt.label }}</button>
        </div>

        <!-- Event cards -->
        <div class="event-list">
          <div
            v-for="event in filteredEvents"
            :key="event.id"
            class="event-card"
            :class="{ 'event-card--done': event.status === 'done' }"
          >
            <div class="event-card-top">
              <span class="date-badge" :class="dateBadgeClass(event.date)">{{ formatDate(event.date) }}</span>
              <span class="category-chip" :style="{ background: CATEGORY_COLORS[event.category] + '22', color: CATEGORY_COLORS[event.category], borderColor: CATEGORY_COLORS[event.category] + '55' }">
                {{ event.category }}
              </span>
              <div class="event-actions">
                <el-button
                  v-if="confirmDeleteEventId !== event.id"
                  text size="small" type="danger"
                  @click="confirmDeleteEventId = event.id"
                >🗑</el-button>
              </div>
            </div>

            <Transition name="expand">
              <div v-if="confirmDeleteEventId === event.id" class="delete-confirm">
                <span class="delete-label">Remove "{{ event.title }}"?</span>
                <div class="delete-actions">
                  <el-button size="small" @click="confirmDeleteEventId = null">Cancel</el-button>
                  <el-button size="small" type="danger" @click="deleteEvent(event.id)">Delete</el-button>
                </div>
              </div>
            </Transition>

            <div class="event-body">
              <span v-if="event.status === 'done'" class="done-badge">✓</span>
              <p class="event-title-text">{{ event.title }}</p>
            </div>
            <p v-if="event.notes" class="event-notes">{{ event.notes }}</p>

            <el-button
              size="small"
              :type="event.status === 'done' ? 'default' : 'success'"
              plain
              class="toggle-btn"
              @click="toggleEventStatus(event)"
            >{{ event.status === 'done' ? 'Mark Pending' : 'Mark Done' }}</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- ── Tab 2: Guests ──────────────────────────────────────── -->
      <el-tab-pane label="Guests">
        <div class="tab-header">
          <div>
            <h2 class="tab-title">Guest List</h2>
            <p class="tab-subtitle">{{ acceptedCount }} accepted / {{ totalGuests }} total · {{ plusOneCount }} with +1</p>
          </div>
          <el-button type="primary" size="small" @click="showAddGuestDialog = true">+ Add Guest</el-button>
        </div>

        <!-- RSVP stats bar -->
        <div class="rsvp-bar-wrapper">
          <div class="rsvp-bar">
            <div class="rsvp-bar-segment rsvp-bar--accepted" :style="{ width: acceptedPct + '%' }" />
            <div class="rsvp-bar-segment rsvp-bar--declined" :style="{ width: declinedPct + '%' }" />
            <div class="rsvp-bar-segment rsvp-bar--pending" :style="{ width: pendingPct + '%' }" />
          </div>
          <div class="rsvp-legend">
            <span class="rsvp-legend-item"><span class="dot dot--accepted" />Accepted {{ acceptedPct }}%</span>
            <span class="rsvp-legend-item"><span class="dot dot--declined" />Declined {{ declinedPct }}%</span>
            <span class="rsvp-legend-item"><span class="dot dot--pending" />Pending {{ pendingPct }}%</span>
          </div>
        </div>

        <!-- Group filter -->
        <div class="filter-pills">
          <button
            v-for="opt in guestGroupOptions"
            :key="opt.value"
            class="filter-pill"
            :class="{ 'filter-pill--active': guestFilter === opt.value }"
            @click="guestFilter = opt.value as 'all' | GuestGroup"
          >{{ opt.label }}</button>
        </div>

        <!-- Guest rows -->
        <div class="guest-list">
          <div
            v-for="guest in filteredGuests"
            :key="guest.id"
            class="guest-row"
            :class="{ 'guest-row--unassigned': guest.tableId === null }"
          >
            <div class="guest-row-main">
              <span class="guest-name">{{ guest.name }}</span>
              <span class="group-badge" :class="`group-badge--${guest.group}`">{{ guest.group }}</span>
              <span v-if="guest.plusOne" class="plus-one-tag">+1</span>
            </div>
            <div class="guest-row-controls">
              <div class="rsvp-pills">
                <button
                  v-for="status in ['pending', 'accepted', 'declined'] as RsvpStatus[]"
                  :key="status"
                  class="rsvp-pill"
                  :class="[`rsvp-pill--${status}`, { 'rsvp-pill--active': guest.rsvp === status }]"
                  @click="setRsvp(guest, status)"
                >{{ status }}</button>
              </div>
              <el-select
                :model-value="guest.tableId"
                size="small"
                placeholder="Unassigned"
                clearable
                class="table-select"
                @change="(val: number | null) => onGuestTableChange(guest, val ?? null)"
              >
                <el-option
                  v-for="opt in tableOptions()"
                  :key="opt.value ?? 'none'"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </div>
            <p v-if="guest.dietaryNotes" class="dietary-notes">🍽 {{ guest.dietaryNotes }}</p>
          </div>
        </div>
      </el-tab-pane>

      <!-- ── Tab 3: Tables ──────────────────────────────────────── -->
      <el-tab-pane label="Tables">
        <div class="tab-header">
          <div>
            <h2 class="tab-title">Table Planner</h2>
            <p class="tab-subtitle">{{ seatedCount }} guests seated / {{ totalGuests }} total</p>
          </div>
          <el-button type="primary" size="small" @click="showAddTableDialog = true">+ Add Table</el-button>
        </div>

        <!-- Venue floor plan -->
        <div class="venue-plan">
          <!-- Stage -->
          <div class="venue-stage">
            <div class="stage-platform"><span class="stage-label">Stage</span></div>
            <div class="stage-runway"></div>
          </div>

          <!-- Round tables -->
          <div class="venue-tables-area">
            <div
              v-for="table in tables"
              :key="table.id"
              class="round-table-wrapper"
              :class="{ 'round-table-wrapper--drag-over': dragOverZone === table.id }"
              @dragover="onDragOver($event, table.id)"
              @dragleave="onDragLeave($event, table.id)"
              @drop.prevent="onDrop(table.id)"
            >
              <div class="round-table-canvas">
                <!-- Seat nodes -->
                <div
                  v-for="(seat, idx) in tableSeats(table.id, table.capacity)"
                  :key="idx"
                  class="seat-node"
                  :class="{
                    'seat-node--filled': !!seat,
                    'seat-node--dragging': seat && draggingGuestId === seat.id,
                    'seat-node--drop-target': !seat && dragOverSeat?.tableId === table.id && dragOverSeat?.seatIdx === idx,
                  }"
                  :style="seatStyle(idx, table.capacity)"
                  :title="seat ? seat.name : `Seat ${idx + 1}`"
                  :data-name="seat ? seat.name : undefined"
                  :draggable="!!seat"
                  @dragstart.stop="seat ? onDragStart($event, seat.id) : undefined"
                  @dragend.stop="onDragEnd"
                  @dragover.stop="!seat ? onDragOverSeat($event, table.id, idx) : undefined"
                  @dragleave.stop="!seat ? onDragLeaveSeat($event, table.id, idx) : undefined"
                  @drop.stop.prevent="!seat ? onDropSeat(table.id, idx) : undefined"
                >
                  <span v-if="seat" class="seat-initials">{{ guestInitials(seat.name) }}</span>
                  <span v-else class="seat-number">{{ idx + 1 }}</span>
                </div>
                <!-- Center disc -->
                <div class="table-disc" :class="{ 'table-disc--over-cap': isOverCapacity(table.id, table.capacity) }">
                  <span class="table-disc-name">{{ tableShortName(table.name) }}</span>
                  <span class="table-disc-count" :class="{ 'table-disc-count--over': isOverCapacity(table.id, table.capacity) }">
                    {{ guestsAtTable(table.id).length }}/{{ table.capacity }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Unassigned pool -->
        <div
          class="unassigned-pool"
          :class="{ 'unassigned-pool--drag-over': dragOverZone === 'unassigned' }"
          @dragover="onDragOver($event, 'unassigned')"
          @dragleave="onDragLeave($event, 'unassigned')"
          @drop.prevent="onDrop(null)"
        >
          <p class="unassigned-title">Unassigned ({{ unassignedGuests.length }})</p>
          <div class="unassigned-chips">
            <span
              v-for="g in unassignedGuests"
              :key="g.id"
              class="guest-chip guest-chip--unassigned guest-chip--draggable"
              :class="{ 'guest-chip--dragging': draggingGuestId === g.id }"
              draggable="true"
              @dragstart="onDragStart($event, g.id)"
              @dragend="onDragEnd"
            >{{ g.name }}</span>
            <span v-if="unassignedGuests.length === 0" class="table-empty">All guests seated 🎉</span>
          </div>
        </div>
      </el-tab-pane>

      <!-- ── Tab 4: Date Picker ─────────────────────────────── -->
      <el-tab-pane label="Date Picker">
        <div class="tab-header">
          <div>
            <h2 class="tab-title">Auspicious Dates</h2>
            <p class="tab-subtitle">Propose and compare dates for each ceremony</p>
          </div>
          <el-button type="primary" size="small" @click="showAddSessionDialog = true">+ New Session</el-button>
        </div>

        <div v-if="sessionsLoading" class="dp-empty">Loading…</div>
        <div v-else-if="sessions.length === 0" class="dp-empty">
          No sessions yet. Create one to start proposing dates.
        </div>

        <div v-else class="dp-sessions-list">
          <div v-for="session in sessions" :key="session.id" class="dp-session-card">
            <div class="dp-session-header" @click="toggleSessionExpand(session.id)">
              <div class="dp-session-meta">
                <span class="dp-session-title">{{ session.title }}</span>
                <span class="dp-session-code">{{ session.shortCode }}</span>
              </div>
              <div class="dp-session-actions" @click.stop>
                <el-button text size="small" @click="copyShareLink(session.shortCode)">🔗 Share</el-button>
                <el-button text size="small" @click="openAddDateDialog(session.id)">+ Date</el-button>
                <el-button text size="small" type="danger" @click="deleteSession(session.id)">🗑</el-button>
              </div>
            </div>

            <div v-if="expandedSessionId === session.id" class="dp-dates-body">
              <div v-if="datesLoading" class="dp-empty">Loading dates…</div>
              <div v-else-if="expandedSessionDates.length === 0" class="dp-empty">
                No dates yet — click "+ Date" to add one.
              </div>
              <div v-else class="dp-date-list">
                <div
                  v-for="entry in expandedSessionDates"
                  :key="entry.id"
                  class="dp-date-row"
                  :class="`dp-date-row--${entry.status}`"
                >
                  <div class="dp-date-top">
                    <span class="date-badge" :class="dateBadgeClass(entry.date)">{{ formatDate(entry.date) }}</span>
                    <span class="dp-ceremony-chip">{{ entry.ceremonyType }}</span>
                    <span
                      class="dp-status-chip"
                      :style="{
                        color: DATE_STATUS_COLORS[entry.status],
                        borderColor: DATE_STATUS_COLORS[entry.status] + '55',
                        background: DATE_STATUS_COLORS[entry.status] + '18',
                      }"
                    >{{ entry.status }}</span>
                    <div class="dp-date-actions">
                      <el-button v-if="entry.status !== 'accepted'" text size="small" type="success" @click="updateDateStatus(entry, 'accepted')">✓ Accept</el-button>
                      <el-button v-if="entry.status !== 'rejected'" text size="small" type="danger"  @click="updateDateStatus(entry, 'rejected')">✗ Reject</el-button>
                      <el-button v-if="entry.status !== 'pending'"  text size="small"               @click="updateDateStatus(entry, 'pending')">↺ Reset</el-button>
                      <el-button text size="small" @click="openComments(entry)">💬 {{ entry.comments.length }}</el-button>
                      <el-button text size="small" type="danger" @click="deleteDate(entry.id)">🗑</el-button>
                    </div>
                  </div>
                  <div class="dp-lunar-row">
                    <span class="dp-lunar-year">{{ getDateLunar(entry.date).yearStr }}</span>
                    <span class="dp-lunar-date">{{ getDateLunar(entry.date).dateStr }}</span>
                    <span class="dp-lunar-sb">{{ getDateLunar(entry.date).sb }}</span>
                    <span class="dp-lunar-officer">{{ getDateLunar(entry.date).officer }}日</span>
                    <span
                      v-for="tag in getDateLunar(entry.date).yi"
                      :key="tag"
                      class="dp-yi-tag"
                      :class="{ 'dp-yi-tag--wedding': WEDDING_YI.includes(tag) }"
                    >{{ tag }}</span>
                  </div>
                  <p v-if="entry.auspiciousNotes" class="dp-auspicious-notes">{{ entry.auspiciousNotes }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

    </el-tabs>

    <!-- ── Add Event Dialog ─────────────────────────────────────── -->
    <el-dialog v-model="showAddEventDialog" title="Add Event" width="360px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="addEvent">
        <el-form-item label="Title">
          <el-input v-model="addEventForm.title" placeholder="e.g. Florist consultation" maxlength="200" autofocus />
        </el-form-item>
        <el-form-item label="Date">
          <el-date-picker v-model="addEventForm.date" type="date" value-format="YYYY-MM-DD" placeholder="Pick a date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Category">
          <el-select v-model="addEventForm.category" style="width: 100%">
            <el-option v-for="cat in ['venue', 'catering', 'attire', 'ceremony', 'admin', 'other']" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="Notes (optional)">
          <el-input v-model="addEventForm.notes" type="textarea" :rows="2" maxlength="512" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddEventDialog = false">Cancel</el-button>
        <el-button type="primary" :disabled="!addEventForm.title.trim() || !addEventForm.date" @click="addEvent">Add</el-button>
      </template>
    </el-dialog>

    <!-- ── Add Guest Dialog ─────────────────────────────────────── -->
    <el-dialog v-model="showAddGuestDialog" title="Add Guest" width="360px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="addGuest">
        <el-form-item label="Name">
          <el-input v-model="addGuestForm.name" placeholder="Full name" maxlength="100" autofocus />
        </el-form-item>
        <el-form-item label="Group">
          <el-select v-model="addGuestForm.group" style="width: 100%">
            <el-option label="Bride's Side" value="bride" />
            <el-option label="Groom's Side" value="groom" />
            <el-option label="Mutual" value="mutual" />
          </el-select>
        </el-form-item>
        <el-form-item label="Plus One">
          <el-switch v-model="addGuestForm.plusOne" />
        </el-form-item>
        <el-form-item label="Dietary Notes (optional)">
          <el-input v-model="addGuestForm.dietaryNotes" type="textarea" :rows="2" maxlength="256" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddGuestDialog = false">Cancel</el-button>
        <el-button type="primary" :disabled="!addGuestForm.name.trim()" @click="addGuest">Add</el-button>
      </template>
    </el-dialog>

    <!-- ── Add Table Dialog ─────────────────────────────────────── -->
    <el-dialog v-model="showAddTableDialog" title="Add Table" width="360px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="addTable">
        <el-form-item label="Table Name">
          <el-input v-model="addTableForm.name" placeholder="e.g. Table 5 — Uni Friends" maxlength="100" autofocus />
        </el-form-item>
        <el-form-item label="Capacity">
          <el-input-number v-model="addTableForm.capacity" :min="1" :max="50" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddTableDialog = false">Cancel</el-button>
        <el-button type="primary" :disabled="!addTableForm.name.trim()" @click="addTable">Add</el-button>
      </template>
    </el-dialog>

    <!-- ── Add Session Dialog ───────────────────────────────────── -->
    <el-dialog v-model="showAddSessionDialog" title="New Date Session" width="360px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="createSession">
        <el-form-item label="Session Title">
          <el-input v-model="addSessionForm.title" placeholder="e.g. Wei & Lin 2026" maxlength="255" autofocus />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddSessionDialog = false">Cancel</el-button>
        <el-button type="primary" :disabled="!addSessionForm.title.trim()" @click="createSession">Create</el-button>
      </template>
    </el-dialog>

    <!-- ── Add Date Dialog ──────────────────────────────────────── -->
    <el-dialog v-model="showAddDateDialog" title="Add Proposed Date" width="380px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="addDate">
        <el-form-item label="Date">
          <el-date-picker v-model="addDateForm.date" type="date" value-format="YYYY-MM-DD" placeholder="Pick a date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Ceremony Type">
          <el-select v-model="addDateForm.ceremonyType" style="width: 100%">
            <el-option v-for="opt in CEREMONY_TYPE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="Auspicious Notes (optional)">
          <el-input v-model="addDateForm.auspiciousNotes" type="textarea" :rows="3" maxlength="1000" placeholder="e.g. 宜嫁娶，吉日。农历六月初六。" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDateDialog = false">Cancel</el-button>
        <el-button type="primary" :disabled="!addDateForm.date" @click="addDate">Add</el-button>
      </template>
    </el-dialog>

    <!-- ── Comments Dialog ──────────────────────────────────────── -->
    <el-dialog v-model="showCommentsDialog" :title="`Comments — ${selectedDateTitle}`" width="420px">
      <div v-if="selectedDateComments.length === 0" class="dp-empty" style="padding: 16px 0">No comments yet.</div>
      <div v-else class="dp-comments-list">
        <div v-for="c in selectedDateComments" :key="c.id" class="dp-comment-item">
          <div class="dp-comment-top">
            <span class="dp-comment-author">{{ c.commenterName }}</span>
            <el-button text size="small" type="danger" @click="deleteComment(c.id)">🗑</el-button>
          </div>
          <p class="dp-comment-text">{{ c.comment }}</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="showCommentsDialog = false">Close</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.wedding-page {
  max-width: 760px;
}

.wedding-header {
  text-align: center;
  padding: 24px 16px 20px;
}

.wedding-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-heading);
}

.wedding-subtitle {
  margin-top: 6px;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.6;
}

.wedding-tabs {
  border-radius: 12px;
}

/* Tab header row */
.tab-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tab-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.tab-subtitle {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 4px 0 0;
}

/* Filter pills */
.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-pill {
  padding: 4px 14px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-pill:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.filter-pill--active {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
  font-weight: 600;
}

/* ── Events ── */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px 16px;
  background: var(--color-background-soft);
  transition: opacity 0.2s;
}

.event-card--done {
  opacity: 0.55;
}

.event-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.event-actions {
  margin-left: auto;
}

.date-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.date-badge--soon {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.date-badge--upcoming {
  background: #fef3c7;
  color: #d97706;
  border-color: #fde68a;
}

.date-badge--future {
  background: var(--color-background-mute);
  color: var(--color-text);
  border-color: var(--color-border);
}

.date-badge--past {
  background: var(--color-background-mute);
  color: var(--color-text);
  opacity: 0.5;
}

.category-chip {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid;
  text-transform: capitalize;
}

.event-body {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.done-badge {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--el-color-success);
  flex-shrink: 0;
}

.event-title-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.event-notes {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.65;
  margin: 0 0 8px;
}

.toggle-btn {
  margin-top: 8px;
}

/* Delete confirm (shared) */
.delete-confirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger-light-5);
}

.delete-label {
  font-size: 0.82rem;
  color: var(--el-color-danger);
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.15s, max-height 0.2s;
  max-height: 60px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ── Guests ── */
.rsvp-bar-wrapper {
  margin-bottom: 16px;
}

.rsvp-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--color-background-mute);
  margin-bottom: 6px;
}

.rsvp-bar-segment {
  transition: width 0.3s;
}

.rsvp-bar--accepted { background: #10b981; }
.rsvp-bar--declined { background: #ef4444; }
.rsvp-bar--pending  { background: #f59e0b; }

.rsvp-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.rsvp-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--color-text);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot--accepted { background: #10b981; }
.dot--declined { background: #ef4444; }
.dot--pending  { background: #f59e0b; }

.guest-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guest-row {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.guest-row--unassigned {
  border-left: 3px solid #f59e0b;
}

.guest-row-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.guest-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-heading);
}

.group-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
  text-transform: capitalize;
}

.group-badge--bride {
  background: #fce7f3;
  color: #db2777;
}

.group-badge--groom {
  background: #dbeafe;
  color: #2563eb;
}

.group-badge--mutual {
  background: #f3f4f6;
  color: #6b7280;
}

.plus-one-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  background: #e0e7ff;
  color: #4338ca;
}

.guest-row-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.rsvp-pills {
  display: flex;
  gap: 4px;
}

.rsvp-pill {
  padding: 3px 10px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: transparent;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
  text-transform: capitalize;
  color: var(--color-text);
}

.rsvp-pill--pending.rsvp-pill--active   { background: #fef3c7; border-color: #f59e0b; color: #92400e; font-weight: 600; }
.rsvp-pill--accepted.rsvp-pill--active  { background: #d1fae5; border-color: #10b981; color: #065f46; font-weight: 600; }
.rsvp-pill--declined.rsvp-pill--active  { background: #fee2e2; border-color: #ef4444; color: #991b1b; font-weight: 600; }

.table-select {
  min-width: 160px;
}

.dietary-notes {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.65;
  margin: 6px 0 0;
}

/* ── Venue Floor Plan ── */
.venue-plan {
  background: #f5f0eb;
  border-radius: 14px;
  padding: 20px 16px 28px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.venue-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28px;
}

.stage-platform {
  width: 55%;
  min-width: 160px;
  max-width: 360px;
  height: 42px;
  background: #374151;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage-label {
  color: #f9fafb;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.stage-runway {
  width: 20%;
  min-width: 56px;
  height: 28px;
  background: #4b5563;
  border-radius: 0 0 4px 4px;
}

.venue-tables-area {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

/* Round table wrapper (drop zone) */
.round-table-wrapper {
  border-radius: 50%;
  transition: background 0.15s, outline 0.15s;
}

.round-table-wrapper--drag-over .round-table-canvas {
  outline: 3px dashed var(--el-color-primary);
  outline-offset: 6px;
  border-radius: 50%;
}

/* Canvas holds the table disc + all seat nodes */
.round-table-canvas {
  position: relative;
  width: 150px;
  height: 150px;
}

/* Center table disc */
.table-disc {
  position: absolute;
  left: 43px;
  top: 43px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #d1d5db;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  z-index: 1;
}

.table-disc--over-cap {
  border-color: #ef4444;
  background: #fff5f5;
}

.table-disc-name {
  font-size: 0.6rem;
  font-weight: 700;
  color: #374151;
  text-align: center;
  line-height: 1.2;
  padding: 0 3px;
  word-break: break-word;
  max-width: 58px;
}

.table-disc-count {
  font-size: 0.65rem;
  color: #6b7280;
  font-weight: 600;
}

.table-disc-count--over {
  color: #ef4444;
}

/* Individual seat nodes */
.seat-node {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e5e7eb;
  border: 1.5px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: background 0.15s, transform 0.1s;
}

.seat-node--filled {
  background: #fbcfe8;
  border-color: #f472b6;
  cursor: grab;
  box-shadow: 0 1px 3px rgba(244,114,182,0.3);
}

.seat-node--filled:active {
  cursor: grabbing;
  transform: scale(0.92);
}

.seat-node--dragging {
  opacity: 0.25;
}

.seat-node--filled::after {
  content: attr(data-name);
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: #f9fafb;
  font-size: 0.65rem;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 5px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 20;
}

.seat-node--filled:not(.seat-node--dragging):hover {
  z-index: 100;
}

.seat-node--filled:not(.seat-node--dragging):hover::after {
  opacity: 1;
}

.seat-initials {
  font-size: 0.5rem;
  font-weight: 700;
  color: #9d174d;
  pointer-events: none;
  letter-spacing: 0;
}

.seat-number {
  font-size: 0.52rem;
  font-weight: 600;
  color: #9ca3af;
  pointer-events: none;
}

.seat-node--drop-target {
  background: #d1fae5;
  border-color: #10b981;
  transform: scale(1.15);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
}

.table-empty {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.4;
}

.guest-chip {
  font-size: 0.75rem;
  padding: 3px 9px;
  border-radius: 12px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

/* Unassigned pool */
.unassigned-pool {
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  padding: 14px;
}

.unassigned-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0 0 10px;
}

.unassigned-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.guest-chip--unassigned {
  background: #fef9c3;
  border-color: #fde68a;
  color: #92400e;
}

.guest-chip--draggable {
  cursor: grab;
}

.guest-chip--draggable:active {
  cursor: grabbing;
}

.guest-chip--dragging {
  opacity: 0.35;
}

.unassigned-pool--drag-over {
  border-color: var(--el-color-primary);
  border-style: solid;
  background: var(--el-color-primary-light-9);
}

/* ── Date Picker ── */
.dp-empty {
  text-align: center;
  padding: 24px 0;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.5;
}

.dp-sessions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dp-session-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-background-soft);
}

.dp-session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  gap: 8px;
  user-select: none;
}

.dp-session-header:hover { background: var(--color-background-mute); }

.dp-session-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dp-session-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dp-session-code {
  font-size: 0.72rem;
  font-family: monospace;
  color: var(--color-text);
  opacity: 0.45;
}

.dp-session-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.dp-dates-body {
  border-top: 1px solid var(--color-border);
  padding: 12px 16px;
}

.dp-date-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dp-date-row {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--color-background);
  transition: opacity 0.2s, border-color 0.2s;
}

.dp-date-row--accepted { border-color: #10b98155; }
.dp-date-row--rejected { opacity: 0.55; }

.dp-date-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.dp-ceremony-chip {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
  color: var(--color-text);
}

.dp-status-chip {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid;
  text-transform: capitalize;
}

.dp-date-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}

.dp-lunar-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
  font-size: 0.73rem;
  opacity: 0.75;
}

.dp-lunar-year {
  color: var(--color-text);
  opacity: 0.7;
}

.dp-lunar-date {
  font-weight: 600;
  color: var(--color-heading);
}

.dp-lunar-sb {
  color: var(--color-text);
}

.dp-lunar-officer {
  color: var(--color-text);
  opacity: 0.8;
}

.dp-yi-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: #e8f5ee;
  color: #0a6640;
  border: 1px solid #b8dfca;
  font-size: 0.7rem;
  white-space: nowrap;
}

.dp-yi-tag--wedding {
  background: #fff3cd;
  color: #92400e;
  border-color: #fcd34d;
  font-weight: 600;
}

.dp-auspicious-notes {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.65;
  margin: 6px 0 0;
  font-style: italic;
}

.dp-comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dp-comment-item {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 10px;
}

.dp-comment-item:last-child { border-bottom: none; }

.dp-comment-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.dp-comment-author {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-heading);
}

.dp-comment-text {
  font-size: 0.82rem;
  color: var(--color-text);
  margin: 0;
}
</style>
