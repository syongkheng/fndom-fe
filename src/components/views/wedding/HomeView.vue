<script setup lang="ts">
import { ref, computed } from 'vue'

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
}

interface WeddingTable {
  id: number
  name: string
  capacity: number
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const events = ref<WeddingEvent[]>([
  { id: 1, title: 'Book venue & pay deposit', date: '2026-03-20', category: 'venue', status: 'pending', notes: null },
  { id: 2, title: 'Send out save-the-dates', date: '2026-04-01', category: 'admin', status: 'done', notes: null },
  { id: 3, title: 'Bridal dress fitting', date: '2026-04-10', category: 'attire', status: 'pending', notes: null },
  { id: 4, title: 'Catering tasting session', date: '2026-05-03', category: 'catering', status: 'pending', notes: null },
  { id: 5, title: 'Rehearsal dinner', date: '2026-06-28', category: 'ceremony', status: 'pending', notes: null },
  { id: 6, title: 'Wedding Day 🎉', date: '2026-07-12', category: 'ceremony', status: 'pending', notes: null },
])

const tables = ref<WeddingTable[]>([
  { id: 1, name: 'Table 1 — VIP', capacity: 8 },
  { id: 2, name: 'Table 2 — Family', capacity: 10 },
  { id: 3, name: 'Table 3 — Friends', capacity: 10 },
  { id: 4, name: 'Table 4 — Colleagues', capacity: 8 },
])

const guests = ref<WeddingGuest[]>([
  { id: 1, name: 'Emily Tan', group: 'bride', rsvp: 'accepted', plusOne: false, dietaryNotes: null, tableId: 1 },
  { id: 2, name: 'James Lim', group: 'groom', rsvp: 'accepted', plusOne: false, dietaryNotes: null, tableId: 1 },
  { id: 3, name: 'Sarah Wong', group: 'bride', rsvp: 'accepted', plusOne: true, dietaryNotes: null, tableId: 2 },
  { id: 4, name: 'David Chen', group: 'groom', rsvp: 'accepted', plusOne: false, dietaryNotes: null, tableId: 2 },
  { id: 5, name: 'Michelle Ng', group: 'mutual', rsvp: 'pending', plusOne: false, dietaryNotes: null, tableId: null },
  { id: 6, name: 'Kevin Ong', group: 'mutual', rsvp: 'declined', plusOne: false, dietaryNotes: null, tableId: null },
  { id: 7, name: 'Fiona Lee', group: 'bride', rsvp: 'accepted', plusOne: true, dietaryNotes: null, tableId: 3 },
  { id: 8, name: 'Ryan Koh', group: 'groom', rsvp: 'accepted', plusOne: false, dietaryNotes: null, tableId: 3 },
  { id: 9, name: 'Priya Nair', group: 'mutual', rsvp: 'pending', plusOne: true, dietaryNotes: null, tableId: null },
  { id: 10, name: 'Thomas Ho', group: 'mutual', rsvp: 'accepted', plusOne: false, dietaryNotes: null, tableId: 4 },
  { id: 11, name: 'Chloe Tan', group: 'bride', rsvp: 'pending', plusOne: false, dietaryNotes: null, tableId: null },
  { id: 12, name: 'Marcus Yap', group: 'groom', rsvp: 'accepted', plusOne: false, dietaryNotes: null, tableId: 4 },
])

let nextEventId = 7
let nextGuestId = 13
let nextTableId = 5

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

function toggleEventStatus(event: WeddingEvent) {
  event.status = event.status === 'done' ? 'pending' : 'done'
}

function deleteEvent(id: number) {
  events.value = events.value.filter(e => e.id !== id)
  confirmDeleteEventId.value = null
}

function addEvent() {
  if (!addEventForm.value.title.trim() || !addEventForm.value.date) return
  events.value.push({
    id: nextEventId++,
    title: addEventForm.value.title.trim(),
    date: addEventForm.value.date,
    category: addEventForm.value.category,
    status: 'pending',
    notes: addEventForm.value.notes.trim() || null,
  })
  showAddEventDialog.value = false
  addEventForm.value = { title: '', date: '', category: 'venue', notes: '' }
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

function setRsvp(guest: WeddingGuest, status: RsvpStatus) {
  guest.rsvp = status
}

function addGuest() {
  if (!addGuestForm.value.name.trim()) return
  guests.value.push({
    id: nextGuestId++,
    name: addGuestForm.value.name.trim(),
    group: addGuestForm.value.group,
    rsvp: 'pending',
    plusOne: addGuestForm.value.plusOne,
    dietaryNotes: addGuestForm.value.dietaryNotes.trim() || null,
    tableId: null,
  })
  showAddGuestDialog.value = false
  addGuestForm.value = { name: '', group: 'mutual', plusOne: false, dietaryNotes: '' }
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

function guestsAtTable(tableId: number): WeddingGuest[] {
  return guests.value.filter(g => g.tableId === tableId)
}

function capacityBarPct(tableId: number, capacity: number): number {
  return Math.min(100, Math.round((guestsAtTable(tableId).length / capacity) * 100))
}

function isOverCapacity(tableId: number, capacity: number): boolean {
  return guestsAtTable(tableId).length > capacity
}

function addTable() {
  if (!addTableForm.value.name.trim() || addTableForm.value.capacity < 1) return
  tables.value.push({
    id: nextTableId++,
    name: addTableForm.value.name.trim(),
    capacity: addTableForm.value.capacity,
  })
  showAddTableDialog.value = false
  addTableForm.value = { name: '', capacity: 8 }
}
</script>

<template>
  <div class="page-container wedding-page">
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
                v-model="guest.tableId"
                size="small"
                placeholder="Unassigned"
                clearable
                class="table-select"
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

        <!-- Table cards -->
        <div class="table-grid">
          <div
            v-for="table in tables"
            :key="table.id"
            class="table-card"
            :class="{ 'table-card--over': isOverCapacity(table.id, table.capacity) }"
          >
            <div class="table-card-header">
              <span class="table-name">{{ table.name }}</span>
              <span class="table-count" :class="{ 'table-count--over': isOverCapacity(table.id, table.capacity) }">
                {{ guestsAtTable(table.id).length }} / {{ table.capacity }}
              </span>
            </div>
            <div class="capacity-bar-track">
              <div
                class="capacity-bar-fill"
                :class="{ 'capacity-bar-fill--over': isOverCapacity(table.id, table.capacity) }"
                :style="{ width: capacityBarPct(table.id, table.capacity) + '%' }"
              />
            </div>
            <div class="table-guests">
              <span v-for="g in guestsAtTable(table.id)" :key="g.id" class="guest-chip">
                {{ g.name }}
              </span>
              <span v-if="guestsAtTable(table.id).length === 0" class="table-empty">No guests assigned</span>
            </div>
          </div>
        </div>

        <!-- Unassigned pool -->
        <div v-if="unassignedGuests.length > 0" class="unassigned-pool">
          <p class="unassigned-title">Unassigned ({{ unassignedGuests.length }})</p>
          <div class="unassigned-chips">
            <span v-for="g in unassignedGuests" :key="g.id" class="guest-chip guest-chip--unassigned">
              {{ g.name }}
            </span>
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

/* ── Tables ── */
.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.table-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px;
  background: var(--color-background-soft);
}

.table-card--over {
  border-color: #ef4444;
  background: #fff5f5;
}

.table-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.table-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-heading);
}

.table-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.7;
}

.table-count--over {
  color: #ef4444;
  opacity: 1;
}

.capacity-bar-track {
  height: 6px;
  border-radius: 3px;
  background: var(--color-background-mute);
  overflow: hidden;
  margin-bottom: 10px;
}

.capacity-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--el-color-primary);
  transition: width 0.3s;
}

.capacity-bar-fill--over {
  background: #ef4444;
}

.table-guests {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
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
</style>
