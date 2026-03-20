<script lang="ts" setup>
import { ref, computed, onMounted, watchEffect, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useNav } from '@/hooks/useNav'
import { useItineraryStore } from '@/stores/itinerary'
import { useBreakpointManager } from '@/hooks/useBreakpointManager'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { createTravelPlannerVTableColumns } from './TravelPlannerVTableColumns'
import { getCategoryEmoji } from '@/constants/TravelCategories'
import type { AgendaItem } from '@/interfaces/forms/itinerary/AgendaItem'
import EmptyState from '@/components/common/EmptyState.vue'
import PrivacyDialog from '@/components/views/travel/PrivacyDialog.vue'
import AgendaDrawer from '@/components/views/travel/AgendaDrawer.vue'
import BookingDrawer from '@/components/views/travel/BookingDrawer.vue'
import type { ItineraryBooking } from '@/interfaces/forms/itinerary/ItineraryBooking'
import { useTravelDayGroups } from '@/composables/useTravelDayGroups'
import { useTravelExport } from '@/composables/useTravelExport'
import { useCityLabel } from '@/composables/useCityLabel'
import { Edit, Delete, ArrowDown } from '@element-plus/icons-vue'
import TravelMapView from '@/components/views/travel/TravelMapView.vue'

const route = useRoute()
const nav = useNav()
const itineraryStore = useItineraryStore()
const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { itinerary, loadingStage } = storeToRefs(itineraryStore)
const { addBooking, removeBooking, updateBooking } = itineraryStore
const { isAuthenticated } = storeToRefs(authStore)

const sessionId = route.params.sessionId as string

const loading = ref(true)
const saving = ref(false)
const editMode = ref<'form' | 'table' | 'map'>('form')

// ── City label ────────────────────────────────────────────────────────────────
const { getCardCity } = useCityLabel()

// ── Collapsible days + grouping ───────────────────────────────────────────────
const agendaItemsRef = computed(() => itinerary.value.agendaItems ?? [])
const { collapsedDays, toggleDay, groupedByDate, formatDate: formatGroupDate, toLocalDateKey } = useTravelDayGroups(agendaItemsRef)

// ── Export ────────────────────────────────────────────────────────────────────
const itineraryAsNullable = computed(() => itinerary.value as any)
const { exportJSON, exportCSV } = useTravelExport(itineraryAsNullable, groupedByDate, getCardCity)

// ── Responsive drawer ─────────────────────────────────────────────────────────
const { width } = useBreakpointManager()
const isMobile = computed(() => width.value <= 600)
const drawerDirection = computed(() => isMobile.value ? 'btt' : 'rtl')
const drawerSize = computed(() => isMobile.value ? '92%' : '420px')


// ── Booking drawer state ───────────────────────────────────────────────────────
const bookingDrawerVisible = ref(false)
const bookingDrawerIsNew = ref(false)
const bookingDrawerItem = ref<ItineraryBooking | null>(null)

const effectivePaxNames = computed(() => {
  if (itinerary.value.paxNames?.length) return itinerary.value.paxNames
  const n = itinerary.value.numberOfPax ?? 1
  if (n === 1) return ['Me']
  return Array.from({ length: n }, (_, i) => `Person ${i + 1}`)
})

const openAddBookingDrawer = () => {
  bookingDrawerIsNew.value = true
  bookingDrawerItem.value = null
  bookingDrawerVisible.value = true
}

const openEditBookingDrawer = (booking: ItineraryBooking) => {
  bookingDrawerIsNew.value = false
  bookingDrawerItem.value = { ...booking }
  bookingDrawerVisible.value = true
}

const onBookingDrawerSave = (booking: ItineraryBooking) => {
  if (bookingDrawerIsNew.value) {
    addBooking(booking)
  } else {
    updateBooking(booking)
  }
}

const onBookingDelete = (booking: ItineraryBooking) => {
  removeBooking(booking)
}

// Pax name editing
const editingPaxNames = ref(false)
const paxNamesInput = ref<string>('')

const startEditPaxNames = () => {
  paxNamesInput.value = effectivePaxNames.value.join(', ')
  editingPaxNames.value = true
}

const savePaxNames = () => {
  const names = paxNamesInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  itinerary.value.paxNames = names.length ? names : undefined
  editingPaxNames.value = false
}

// Booking summary computed
const bookingTotal = computed(() =>
  (itinerary.value.bookings ?? []).reduce((sum, b) => sum + (b.price ?? 0), 0),
)
const bookingBookedCount = computed(() =>
  (itinerary.value.bookings ?? []).filter((b) => b.booked).length,
)
const bookingsCollapsed = ref(false)

function parsePayment(payment: string | undefined): { label: string; date?: string; type: 'success' | 'warning' | 'info' } | null {
  if (!payment) return null
  const match = payment.match(/^([^(]+?)\s*(?:\(([^)]+)\))?$/)
  if (!match) return { label: payment, type: 'info' }
  const label = match[1].trim()
  const date = match[2]?.trim()
  const lc = label.toLowerCase()
  const type = lc === 'instant' ? 'success' : lc === 'delayed' ? 'warning' : 'info'
  return { label, date, type }
}

const BOOKING_EMOJI: Record<string, string> = {
  flight: '✈️',
  accommodation: '🏨',
  transport: '🚌',
  other: '📦',
}
const getBookingEmoji = (category?: string) => BOOKING_EMOJI[category ?? ''] ?? '📦'

// ── Drawer state ──────────────────────────────────────────────────────────────
const drawerVisible = ref(false)
const drawerIsNew = ref(false)
const drawerEditKey = ref<string | undefined>()
const drawerItem = ref<AgendaItem | null>(null)

const makeBlankDraft = (presetDate = ''): AgendaItem => ({
  _localIndex: `agenda-${Date.now()}`,
  category: undefined,
  title: '',
  desc: '',
  date: presetDate,
  city: '',
  cityRaw: [],
  unknownTime: true,
  startTime: undefined,
  endTime: undefined,
  files: [],
  _fileIdsToDelete: [],
  _fileIdsToInsert: [],
  _agendaToFileMapping: [],
})

const openAddDrawer = (presetDate?: string) => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  drawerIsNew.value = true
  drawerEditKey.value = undefined
  const normalised = presetDate ? toLocalDateKey(presetDate) : ''
  drawerItem.value = makeBlankDraft(normalised === '__tbc__' ? '' : normalised)
  drawerVisible.value = true
}

const openEditDrawer = (item: AgendaItem) => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  drawerIsNew.value = false
  drawerEditKey.value = item.id ?? item._localIndex
  const a = item as any
  const cityRaw: string[] =
    item.cityRaw?.length
      ? item.cityRaw
      : (() => { try { return JSON.parse(a.city_raw ?? '[]') } catch { return [] } })()
  drawerItem.value = {
    ...item,
    startTime: item.startTime ?? a.start_time ?? undefined,
    endTime: item.endTime ?? a.end_time ?? undefined,
    unknownTime: item.unknownTime !== undefined ? item.unknownTime : !!a.unknown_time,
    cityRaw,
  }
  drawerVisible.value = true
}

const onDrawerSave = (item: AgendaItem) => {
  if (drawerIsNew.value) {
    itinerary.value.agendaItems.push({ ...item })
  } else {
    const idx = itinerary.value.agendaItems.findIndex(
      (i) => (i.id ?? i._localIndex) === drawerEditKey.value,
    )
    if (idx !== -1) itinerary.value.agendaItems[idx] = { ...item }
  }
  drawerVisible.value = false
}

// ── Form mode helpers ─────────────────────────────────────────────────────────

const getCardTime = (item: AgendaItem) => {
  const unknownTime = item.unknownTime || !!(item as any).unknown_time
  const st = item.startTime ?? (item as any).start_time
  if (unknownTime || !st) return null
  const toHHMM = (val: any) => {
    if (typeof val === 'string') return val.slice(0, 5)
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  const start = toHHMM(st)
  if (!start) return null
  const et = item.endTime ?? (item as any).end_time
  const end = et ? toHHMM(et) : null
  return end ? `${start} – ${end}` : start
}

// ── Table mode (unchanged) ────────────────────────────────────────────────────
const addAgendaItem = () => {
  itinerary.value.agendaItems.push({
    id: undefined,
    _localIndex: `agenda-${Date.now()}`,
    date: '',
    city: '',
    cityRaw: [],
    title: '',
    desc: '',
    unknownTime: true,
    files: [],
    _fileIdsToDelete: [],
    _fileIdsToInsert: [],
    _agendaToFileMapping: [],
  })
}

const removeAgendaItem = (id: string) => {
  const index = itinerary.value.agendaItems.findIndex(
    (i) => String(i.id) === id || i._localIndex === id,
  )
  if (index !== -1) {
    const item = itinerary.value.agendaItems[index]
    if (item.id != null) itinerary.value._agendaIdsToDelete?.push(item.id)
    itinerary.value.agendaItems.splice(index, 1)
  }
}

const tableData = computed(() => [
  ...itinerary.value.agendaItems,
  { id: '__add__', isAddRow: true },
])

const columns = createTravelPlannerVTableColumns(
  addAgendaItem,
  removeAgendaItem,
  () => ({
    startDate: itinerary.value.startDate,
    endDate: itinerary.value.endDate,
    unknownDate: itinerary.value.unknownDate,
  }),
)

// ── Shared ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (!isAuthenticated.value) {
    layoutStore.loginDialog.setTrue()
    loading.value = false
    return
  }
  await itineraryStore.retrieveItineraryForUpdate(sessionId)
  loading.value = false
  if (!sessionStorage.getItem(privacySeenKey) && !itinerary.value.challenge) {
    privacyDialogVisible.value = true
  }
})

const handleSave = async () => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  saving.value = true
  const result = await itineraryStore.updateItinerary()
  saving.value = false
  if (result.isSuccess) {
    ElMessage.success('Trip saved.')
  } else if (result.error === 'auth') {
    ElMessage.warning('Please log in to save.')
  } else {
    ElMessage.error('Failed to save. Please try again.')
  }
}

const handleShare = () => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  if (!itinerary.value.shortCode) {
    ElMessage.info('Save the trip first to generate a share link.')
    return
  }
  const url = `${window.location.origin}/travel/v/${itinerary.value.shortCode}`
  navigator.clipboard.writeText(url)
  ElMessage.success('Share link copied!')
}

// ── Privacy / challenge ───────────────────────────────────────────────────────
const privacyDialogVisible = ref(false)
const privacySeenKey = `itinerary-privacy-seen-${sessionId}`
const privacyDialogRef = ref<{ setDigits: (d: string[]) => void } | null>(null)

const openPrivacyDialog = () => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  const existing = itinerary.value.challenge ?? ''
  const digits = [...existing.slice(0, 6).split(''), '', '', '', '', ''].slice(0, 6)
  privacyDialogVisible.value = true
  // Set existing digits after dialog opens
  nextTick(() => privacyDialogRef.value?.setDigits(digits))
}

const onPrivacySave = (code: string | undefined) => {
  itinerary.value.challenge = code
  sessionStorage.setItem(privacySeenKey, '1')
  ElMessage.success(
    code
      ? 'Access code set. Save your trip to apply.'
      : 'No access code set — trip remains public.',
  )
}

const onPrivacyClose = () => {
  sessionStorage.setItem(privacySeenKey, '1')
}

</script>

<template>
  <div class="planner-view">

    <!-- Auth gate -->
    <div v-if="!isAuthenticated" class="planner-auth-gate">
      <div class="auth-gate-icon">🔒</div>
      <p class="auth-gate-text">Please log in to edit this trip.</p>
      <el-button type="primary" @click="layoutStore.loginDialog.setTrue()">Log In</el-button>
    </div>

    <template v-else>

    <!-- Top bar -->
    <div class="planner-topbar">
      <el-button link @click="nav.redirectTo('/travel')" class="back-btn">← Trips</el-button>
      <div class="planner-actions">
        <el-segmented v-model="editMode" size="small"
          :options="[{ label: '📋 Form', value: 'form' }, { label: '🗺️ Map', value: 'map' }]" />
        <el-dropdown size="small" trigger="click" @command="(cmd: string) => cmd === 'json' ? exportJSON() : exportCSV()">
          <el-button size="small">Export ↓</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">Export as JSON</el-dropdown-item>
              <el-dropdown-item command="csv">Export as CSV</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button size="small" @click="handleShare">Share 🔗</el-button>
        <el-tooltip :content="itinerary.challenge ? 'Access code set' : 'No access code'" placement="bottom">
          <el-button size="small" @click="openPrivacyDialog">
            {{ itinerary.challenge ? '🔒' : '🔓' }}
          </el-button>
        </el-tooltip>
        <el-button type="primary" size="small" :loading="saving" @click="handleSave">Save</el-button>
      </div>
    </div>

    <!-- Trip header -->
    <div class="planner-header">
      <el-input v-model="itinerary.sessionTitle" class="title-input" placeholder="Trip title" :border="false" />
      <div class="header-meta">
        <el-input v-model="itinerary.destination" placeholder="Destination" size="small" style="width: 200px" />
        <el-date-picker :model-value="itinerary.itineraryDateRaw" type="daterange" range-separator="to"
          start-placeholder="Start" end-placeholder="End" size="small" value-format="YYYY-MM-DD"
          @update:model-value="(v: string[]) => itineraryStore.onItineraryDateSelection(v)" />
        <el-input-number v-model="itinerary.numberOfPax" :min="1" size="small" style="width: 110px" placeholder="Pax" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="planner-loading">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- ── FORM MODE ─────────────────────────────────────────────────────── -->
    <div v-else-if="editMode === 'form'" class="form-mode">

      <!-- Empty state -->
      <EmptyState v-if="groupedByDate.length === 0" icon="🗺️" title="No agenda items yet.">
        <el-button type="primary" @click="openAddDrawer()">+ Add First Item</el-button>
      </EmptyState>

      <!-- Day groups -->
      <div v-else>
        <div v-for="group in groupedByDate" :key="group.date" class="day-group">
          <div class="day-group-header" @click="toggleDay(group.date)">
            <div v-if="group.dayNumber !== null" class="day-badge">{{ group.dayNumber }}</div>
            <div class="day-label">{{ formatGroupDate(group.date) }}</div>
            <span class="day-item-count" v-if="collapsedDays.has(group.date)">{{ group.items.length }} item{{ group.items.length === 1 ? '' : 's' }}</span>
            <span class="day-chevron">{{ collapsedDays.has(group.date) ? '›' : '⌄' }}</span>
          </div>

          <div v-show="!collapsedDays.has(group.date)" class="agenda-cards">
            <div v-for="item in group.items" :key="item.id ?? item._localIndex" class="agenda-card"
              :class="item.id ? 'card--saved' : 'card--new'">
              <div class="card-icon">{{ getCategoryEmoji(item.category) }}</div>
              <div class="card-body">
                <div class="card-title">{{ item.title || 'Untitled' }}</div>
                <div v-if="getCardTime(item) || getCardCity(item) || item.budget" class="card-meta">
                  <span v-if="getCardTime(item)" class="card-time">{{ getCardTime(item) }}</span>
                  <span v-if="getCardCity(item)" class="card-city">
                    <template v-if="getCardTime(item)"> · </template>{{ getCardCity(item) }}
                  </span>
                  <template v-if="item.budget">
                    <span class="card-sep" v-if="getCardTime(item) || getCardCity(item)"> · </span>
                    <span class="card-budget">💰 {{ item.budget.toLocaleString() }}</span>
                  </template>
                </div>
                <div v-if="item.desc" class="card-notes">{{ item.desc }}</div>
              </div>
              <div class="card-right">
                <div class="card-actions">
                  <el-tooltip content="Edit" placement="top">
                    <el-button circle size="small" @click="openEditDrawer(item)">
                      <span style="font-size:0.72rem">✏️</span>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="Delete" placement="top">
                    <el-button circle size="small" @click="removeAgendaItem(String(item.id ?? item._localIndex))">
                      <span style="font-size:0.72rem">🗑️</span>
                    </el-button>
                  </el-tooltip>
                </div>
                <div class="card-save-status">
                  <span v-if="!item.id" class="status--new">Unsaved</span>
                  <span v-else class="status--saved">Saved</span>
                </div>
              </div>
            </div>
          </div>

          <button v-show="!collapsedDays.has(group.date)" class="add-to-day-btn" @click="openAddDrawer(group.date !== '__tbc__' ? group.date : '')">
            + Add to {{ group.dayNumber !== null ? `Day ${group.dayNumber}` : 'Date TBC' }}
          </button>
        </div>

        <div class="form-add-global">
          <el-button @click="openAddDrawer()">+ Add Item</el-button>
        </div>
      </div>
    </div>

    <!-- ── MAP MODE ──────────────────────────────────────────────────────── -->
    <div v-else-if="editMode === 'map'" class="planner-map">
      <TravelMapView :agenda-items="itinerary.agendaItems ?? []" />
    </div>


      <!-- ── Bookings Section ──────────────────────────────────────────────── -->
      <div class="bookings-section">
        <div class="bookings-header" @click="bookingsCollapsed = !bookingsCollapsed">
          <div class="bookings-header-left">
            <span class="bookings-title">Bookings</span>
            <div class="bookings-pills">
              <span class="booking-pill">SGD {{ bookingTotal.toFixed(2) }}</span>
              <span class="booking-pill">{{ bookingBookedCount }} / {{ (itinerary.bookings ?? []).length }} booked</span>
            </div>
          </div>
          <div class="bookings-header-right">
            <div class="pax-names-editor" @click.stop>
              <template v-if="editingPaxNames">
                <el-input
                  v-model="paxNamesInput"
                  size="small"
                  placeholder="Dad, Mum, Me"
                  style="width: 180px"
                  @keyup.enter="savePaxNames"
                  @blur="savePaxNames"
                />
              </template>
              <template v-else>
                <span class="pax-names-display" @click="startEditPaxNames" title="Click to edit traveller names">
                  {{ effectivePaxNames.join(' · ') }}
                </span>
              </template>
            </div>
            <el-icon class="collapse-icon" :class="{ 'is-collapsed': bookingsCollapsed }">
              <arrow-down />
            </el-icon>
          </div>
        </div>

        <div v-show="!bookingsCollapsed">
          <div v-if="!(itinerary.bookings ?? []).length" class="bookings-empty">
            No bookings yet. Click "+ Add Booking" to get started.
          </div>
          <template v-else>
            <!-- Mobile: card list -->
            <div v-if="isMobile" class="booking-cards">
              <div
                v-for="booking in itinerary.bookings"
                :key="booking._localIndex ?? booking.id"
                class="booking-card"
              >
                <div class="booking-card-header">
                  <span class="booking-cat-emoji">{{ getBookingEmoji(booking.category) }}</span>
                  <span class="booking-card-item">{{ booking.item }}</span>
                  <el-tag v-if="booking.booked" type="success" size="small" effect="light">Booked</el-tag>
                  <el-tag v-else type="info" size="small" effect="light">Pending</el-tag>
                </div>
                <div class="booking-card-meta">
                  <span v-if="booking.remarks">📍 {{ booking.remarks }}</span>
                  <span v-if="booking.price != null">SGD {{ booking.price.toFixed(2) }}</span>
                  <span v-if="booking.nights">{{ booking.nights }}N</span>
                </div>
                <div class="booking-card-actions">
                  <el-button size="small" @click="openEditBookingDrawer(booking)">Edit</el-button>
                  <el-button size="small" type="danger" plain @click="onBookingDelete(booking)">Delete</el-button>
                </div>
              </div>
            </div>

            <!-- Desktop: table -->
            <el-table v-else :data="itinerary.bookings ?? []" class="booking-table" size="small">
              <el-table-column width="40">
                <template #default="{ row }">
                  <span>{{ getBookingEmoji(row.category) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Item" min-width="160">
                <template #default="{ row }">
                  <a v-if="row.link" :href="row.link" target="_blank" class="booking-link">{{ row.item }}</a>
                  <span v-else>{{ row.item }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Remarks" min-width="80">
                <template #default="{ row }">
                  <span v-if="row.remarks">{{ row.remarks }}</span>
                  <span v-else class="dim">—</span>
                </template>
              </el-table-column>
              <el-table-column label="Payment" width="100">
                <template #default="{ row }">
                  <template v-if="parsePayment(row.payment) as any">
                    <el-tooltip
                      v-if="parsePayment(row.payment)!.date"
                      :content="parsePayment(row.payment)!.date"
                      placement="top"
                    >
                      <el-tag :type="parsePayment(row.payment)!.type" size="small" effect="light" style="cursor:default">
                        {{ parsePayment(row.payment)!.label }}
                      </el-tag>
                    </el-tooltip>
                    <el-tag v-else :type="parsePayment(row.payment)!.type" size="small" effect="light">
                      {{ parsePayment(row.payment)!.label }}
                    </el-tag>
                  </template>
                  <span v-else class="dim">—</span>
                </template>
              </el-table-column>
              <el-table-column
                v-for="name in effectivePaxNames"
                :key="name"
                :label="name"
                width="80"
              >
                <template #default="{ row }">
                  <span v-if="row.paxBreakdown?.[name] != null">{{ row.paxBreakdown[name].toFixed(0) }}</span>
                  <span v-else class="dim">—</span>
                </template>
              </el-table-column>
              <el-table-column label="Total" width="80">
                <template #default="{ row }">
                  <span v-if="row.price != null">{{ row.price.toFixed(2) }}</span>
                  <span v-else class="dim">—</span>
                </template>
              </el-table-column>
              <el-table-column label="Dates" width="150">
                <template #default="{ row }">
                  <span v-if="row.startDate || row.endDate">
                    {{ row.startDate ?? '' }}<template v-if="row.startDate && row.endDate"> → </template>{{ row.endDate ?? '' }}
                    <template v-if="row.nights"> ({{ row.nights }}N)</template>
                  </span>
                  <span v-else class="dim">—</span>
                </template>
              </el-table-column>
              <el-table-column label="Booked" width="70" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.booked ? 'success' : 'info'" size="small" effect="light">
                    {{ row.booked ? '✓' : '✗' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="Cancellation" min-width="130">
                <template #default="{ row }">
                  <span v-if="row.freeCancellation">{{ row.freeCancellation }}</span>
                  <span v-else class="dim">—</span>
                </template>
              </el-table-column>
              <el-table-column label="" width="80" fixed="right">
                <template #default="{ row }">
                  <div class="booking-actions">
                    <el-button size="small" circle @click="openEditBookingDrawer(row)">
                      <el-icon><edit /></el-icon>
                    </el-button>
                    <el-button size="small" circle type="danger" plain @click="onBookingDelete(row)">
                      <el-icon><delete /></el-icon>
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </template>

          <div class="bookings-add-row">
            <el-button size="small" @click="openAddBookingDrawer">+ Add Booking</el-button>
          </div>
        </div>
      </div>

    </template>
  </div>

  <el-backtop target=".wrapper" :visibility-height="300" :right="24" :bottom="32" />

  <!-- ── PRIVACY DIALOG ───────────────────────────────────────────────── -->
  <PrivacyDialog
    ref="privacyDialogRef"
    v-model="privacyDialogVisible"
    @save="onPrivacySave"
    @update:model-value="(v) => { if (!v) onPrivacyClose() }"
  />

  <!-- ── DRAWER ─────────────────────────────────────────────────────────── -->
  <AgendaDrawer
    v-model="drawerVisible"
    :item="drawerItem"
    :is-new="drawerIsNew"
    :drawer-direction="drawerDirection"
    :drawer-size="drawerSize"
    :start-date="itinerary.startDate"
    :end-date="itinerary.endDate"
    :unknown-date="itinerary.unknownDate"
    @save="onDrawerSave"
  />

  <BookingDrawer
    v-model="bookingDrawerVisible"
    :item="bookingDrawerItem"
    :is-new="bookingDrawerIsNew"
    :pax-names="effectivePaxNames"
    :drawer-direction="drawerDirection"
    :drawer-size="drawerSize"
    @save="onBookingDrawerSave"
    @cancel="bookingDrawerVisible = false"
  />
</template>

<style scoped>
.planner-view {
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  width: 100%;
  height: 100%;
  justify-self: center;
  box-sizing: border-box;
}

/* ── Topbar ── */
.planner-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 8px;
}

.back-btn {
  font-size: 0.85rem;
  color: var(--color-text);
  padding: 0;
}

.planner-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ── Trip header ── */
.planner-header {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.title-input :deep(.el-input__wrapper) {
  box-shadow: none;
  padding: 0;
  background: transparent;
}

.title-input :deep(.el-input__inner) {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-heading);
  height: auto;
  padding: 0;
}

.header-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.planner-loading {
  padding: 20px 0;
}

/* ── Map mode ── */
.planner-map {
  flex: 1;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

/* ── Table mode ── */
.planner-table {
  flex: 1;
  min-height: 400px;
}

/* ── Form mode ── */
.form-mode {
  flex: 1;
}

/* Day groups */
.day-group {
  margin-bottom: 28px;
}

.day-group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
}

.day-group-header:hover .day-label {
  color: var(--el-color-primary);
}

.day-item-count {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.45;
  margin-left: 2px;
}

.day-chevron {
  margin-left: auto;
  font-size: 1rem;
  color: var(--color-text);
  opacity: 0.4;
  line-height: 1;
}

.day-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.day-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-heading);
}

/* Agenda cards */
.agenda-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.agenda-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  border-left: 3px solid transparent;
  background: var(--color-background-soft);
  transition: background 0.12s;
}

.agenda-card:hover {
  background: var(--color-background-mute);
}

.card--new {
  border-left-color: var(--el-color-warning);
}

.card--saved {
  border-left-color: var(--el-color-success);
}

.card-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
  width: 32px;
  text-align: center;
  padding-top: 1px;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
  line-height: 1.35;
}

.card-meta {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.65;
  margin-top: 3px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
}

.card-time {
  color: var(--el-color-primary);
  font-weight: 600;
  opacity: 1;
}

.card-city {
  opacity: 0.8;
}

.card-sep {
  opacity: 0.4;
}

.card-budget {
  color: var(--color-text);
}

.card-notes {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.5;
  margin-top: 4px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.45;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-save-status {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.status--new {
  color: var(--el-color-warning);
}

.status--saved {
  color: var(--el-color-success);
  opacity: 0.7;
}

/* Add to day */
.add-to-day-btn {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  margin-top: 2px;
  font-size: 0.8rem;
  color: var(--el-color-primary);
  background: none;
  border: 1px dashed var(--el-color-primary);
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.12s;
}

.add-to-day-btn:hover {
  opacity: 1;
}

.form-add-global {
  margin-top: 8px;
}

/* ── Auth gate ── */
.planner-auth-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 0;
}

.auth-gate-icon {
  font-size: 2.4rem;
}

.auth-gate-text {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.6;
}

/* ── Mobile ── */
@media (max-width: 600px) {
  .header-meta {
    flex-direction: column;
    align-items: stretch;
  }

  .header-meta>* {
    width: 100% !important;
  }

  .planner-actions {
    gap: 6px;
  }
}

/* Bookings section */
.bookings-section {
  margin-top: 32px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.bookings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-background-soft);
  cursor: pointer;
  user-select: none;
  gap: 12px;
}

.bookings-header:hover {
  background: var(--color-background-mute);
}

.bookings-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.bookings-title {
  font-weight: 600;
  font-size: 14px;
}

.bookings-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.booking-pill {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  white-space: nowrap;
}

.bookings-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.pax-names-display {
  font-size: 12px;
  color: var(--color-text);
  opacity: 0.7;
  cursor: pointer;
  text-decoration: underline dashed;
  text-underline-offset: 3px;
}

.pax-names-display:hover {
  opacity: 1;
}

.collapse-icon {
  transition: transform 0.2s;
  color: var(--color-text);
  opacity: 0.5;
}

.collapse-icon.is-collapsed {
  transform: rotate(-90deg);
}

.bookings-empty {
  padding: 24px 16px;
  font-size: 13px;
  color: var(--color-text);
  opacity: 0.6;
  text-align: center;
}

.bookings-add-row {
  padding: 10px 16px;
  border-top: 1px solid var(--color-border);
}

.booking-table {
  width: 100%;
}

.booking-table :deep(.dim) {
  opacity: 0.35;
}

.booking-table :deep(.booking-link) {
  color: var(--el-color-primary);
  text-decoration: none;
}

.booking-table :deep(.booking-link:hover) {
  text-decoration: underline;
}

.booking-actions {
  display: flex;
  gap: 4px;
}

/* Mobile booking cards */
.booking-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
}

.booking-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.booking-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.booking-cat-emoji {
  font-size: 16px;
}

.booking-card-item {
  font-weight: 500;
  flex: 1;
  min-width: 0;
}

.booking-card-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--color-text);
  opacity: 0.75;
  flex-wrap: wrap;
}

.booking-card-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
</style>
