<script lang="ts" setup>
import { ref, computed, onMounted, watchEffect, nextTick, watch } from 'vue'
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
import { useTravelDayGroups, type AgendaRow } from '@/composables/useTravelDayGroups'
import { useTravelExport } from '@/composables/useTravelExport'
import { useCityLabel } from '@/composables/useCityLabel'
import { Edit, Delete, ArrowDown } from '@element-plus/icons-vue'
import TravelMapView from '@/components/views/travel/TravelMapView.vue'
import PackingDrawer from '@/components/views/travel/PackingDrawer.vue'
import { getPackingCategoryEmoji, PACKING_CATEGORIES } from '@/constants/TravelCategories'
import type { PackingItem } from '@/interfaces/forms/itinerary/PackingItem'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const nav = useNav()
const itineraryStore = useItineraryStore()
const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { itinerary, loadingStage } = storeToRefs(itineraryStore)
const { addBooking, removeBooking, updateBooking, addPackingItem, removePackingItem, updatePackingItem, togglePackingItem, saveDraft, loadDraft, migrateDraft } = itineraryStore
const { isAuthenticated } = storeToRefs(authStore)

const sessionId = route.params.sessionId as string
const isDraft = computed(() => route.path === '/travel/draft')

const loading = ref(true)
const saving = ref(false)
const editMode = ref<'form' | 'table' | 'map'>('form')

// ── City label ────────────────────────────────────────────────────────────────
const { getCardCity } = useCityLabel()

// ── Collapsible days + grouping ───────────────────────────────────────────────
const agendaItemsRef = computed(() => itinerary.value.agendaItems ?? [])
const { collapsedDays, toggleDay, groupedByDate, formatDate: formatGroupDate, toLocalDateKey, collapseAll, expandAll, allCollapsed } = useTravelDayGroups(agendaItemsRef)

// ── Export ────────────────────────────────────────────────────────────────────
const itineraryAsNullable = computed(() => itinerary.value as any)
const { exportJSON, exportCSV, exportICS } = useTravelExport(itineraryAsNullable, groupedByDate, getCardCity)
const { t } = useI18n()

// ── Responsive drawer ─────────────────────────────────────────────────────────
const { width } = useBreakpointManager()
const isMobile = computed(() => width.value <= 600)
const isSplit = computed(() => width.value > 900)
const isMapFullscreen = ref(false)
const drawerDirection = computed(() => isMobile.value ? 'btt' : 'rtl')
const drawerSize = computed(() => isMobile.value ? '92%' : '420px')

function scrollToTop() {
  const wrapper = document.querySelector('.wrapper')
  if (wrapper && wrapper.scrollTop > 0) {
    wrapper.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}


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

// ── Packing drawer state ──────────────────────────────────────────────────────
const packingDrawerVisible = ref(false)
const packingDrawerIsNew = ref(false)
const packingDrawerItem = ref<PackingItem | null>(null)

const openAddPackingDrawer = () => {
  packingDrawerIsNew.value = true
  packingDrawerItem.value = null
  packingDrawerVisible.value = true
}

const openEditPackingDrawer = (item: PackingItem) => {
  packingDrawerIsNew.value = false
  packingDrawerItem.value = { ...item }
  packingDrawerVisible.value = true
}

const onPackingDrawerSave = (item: PackingItem) => {
  if (packingDrawerIsNew.value) addPackingItem(item)
  else updatePackingItem(item)
}

// Packing list computed
const packingItemsByCategory = computed(() => {
  const items = itinerary.value.packingItems ?? []
  return PACKING_CATEGORIES
    .map((cat) => ({
      cat,
      items: items.filter((i) => i.category === cat.key),
    }))
    .filter((g) => g.items.length > 0)
})

const packingPackedCount = computed(() =>
  (itinerary.value.packingItems ?? []).filter((i) => i.packed).length,
)

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
const packingCollapsed = ref(false)

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
const drawerUploading = ref(false)

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
  _filesToInsert: [],
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

const openEditDrawer = (row: AgendaRow) => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  const item = row as AgendaItem
  drawerIsNew.value = false
  drawerEditKey.value = item.id ?? item._localIndex
  const cityRaw: string[] =
    item.cityRaw?.length
      ? item.cityRaw
      : (() => { try { return JSON.parse((row.city_raw ?? row.city) ?? '[]') } catch { return [] } })()
  drawerItem.value = {
    ...item,
    startTime: item.startTime ?? (row.start_time as string | undefined) ?? undefined,
    endTime: item.endTime ?? (row.end_time as string | undefined) ?? undefined,
    unknownTime: item.unknownTime !== undefined ? item.unknownTime : !!(row.unknown_time),
    cityRaw,
    coordinates: item.coordinates ?? undefined,
    _filesToInsert: item._filesToInsert ?? [],
    _fileIdsToDelete: item._fileIdsToDelete ?? [],
    _agendaToFileMapping: item._agendaToFileMapping ?? [],
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

const onDrawerSync = (item: AgendaItem) => {
  const key = drawerEditKey.value
  if (!key) return
  const idx = itinerary.value.agendaItems.findIndex(
    (i) => (i.id ?? i._localIndex) === key,
  )
  if (idx !== -1) itinerary.value.agendaItems[idx] = { ...item }
}

// ── Form mode helpers ─────────────────────────────────────────────────────────

const getCardTime = (item: AgendaRow) => {
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
    _filesToInsert: [],
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
  if (isDraft.value) {
    itineraryStore.resetItinerary()
    loadDraft()
    loading.value = false
    return
  }
  if (!isAuthenticated.value) {
    layoutStore.loginDialog.setTrue()
    loading.value = false
    return
  }
  const loadResult = await itineraryStore.retrieveItineraryForUpdate(sessionId)
  loading.value = false
  if (loadResult.forbidden) {
    ElMessage.error(t('travel.planner.notYours'))
    nav.redirectTo('/travel')
    return
  }
  if (!sessionStorage.getItem(privacySeenKey) && !itinerary.value.challenge) {
    privacyDialogVisible.value = true
  }
})

// ── Auto-save ─────────────────────────────────────────────────────────────────
const autoSaveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let skipNextWatch = true

watch(
  () => JSON.stringify(itinerary.value),
  () => {
    if (skipNextWatch) { skipNextWatch = false; return }
    if (isDraft.value) { saveDraft(); return }
    if (!isAuthenticated.value || !itinerary.value.id || saving.value) return
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveStatus.value = 'saving'
    autoSaveTimer = setTimeout(async () => {
      if (drawerUploading.value) return
      const result = await itineraryStore.updateItinerary()
      autoSaveStatus.value = result.isSuccess ? 'saved' : 'error'
      if (result.isSuccess) setTimeout(() => { autoSaveStatus.value = 'idle' }, 3000)
    }, 2500)
  },
)

// ── Draft migration ───────────────────────────────────────────────────────────
watch(isAuthenticated, async (authed) => {
  if (!authed || !isDraft.value) return
  const newSessionId = await migrateDraft()
  if (newSessionId) {
    ElMessage.success(t('travel.planner.draftMigrated'))
    nav.redirectTo(`/travel/${newSessionId}`)
  }
})

const handleSave = async () => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  if (drawerUploading.value) {
    ElMessage.warning(t('travel.planner.uploadInProgress', 'Please wait for the photo upload to complete.'))
    return
  }
  saving.value = true
  const result = await itineraryStore.updateItinerary()
  saving.value = false
  if (result.isSuccess) {
    ElMessage.success(t('travel.planner.tripSaved'))
  } else if (result.error === 'auth') {
    ElMessage.warning(t('travel.planner.loginToSave'))
  } else {
    ElMessage.error(t('travel.planner.saveFailed'))
  }
}

const handleShare = () => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  if (!itinerary.value.shortCode) {
    ElMessage.info(t('travel.planner.saveFirst'))
    return
  }
  const url = `${window.location.origin}/travel/v/${itinerary.value.shortCode}`
  navigator.clipboard.writeText(url)
  ElMessage.success(t('travel.list.linkCopied'))
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
      ? t('travel.planner.accessCodeApplied')
      : t('travel.planner.noAccessCodeSet'),
  )
}

const onPrivacyClose = () => {
  sessionStorage.setItem(privacySeenKey, '1')
}

</script>

<template>
  <div class="planner-view">

    <!-- Auth gate -->
    <div v-if="!isAuthenticated && !isDraft" class="planner-auth-gate">
      <div class="auth-gate-icon">🔒</div>
      <p class="auth-gate-text">{{ t('travel.planner.loginPrompt') }}</p>
      <el-button type="primary" @click="layoutStore.loginDialog.setTrue()">{{ t('travel.planner.login') }}</el-button>
    </div>

    <template v-else>

    <!-- Top bar -->
    <div class="planner-topbar">
      <el-button link @click="nav.redirectTo('/travel')" class="back-btn">{{ t('travel.planner.back') }}</el-button>
      <div class="planner-actions">
        <span v-if="autoSaveStatus !== 'idle'" class="autosave-status" :class="`autosave-status--${autoSaveStatus}`">
          {{ autoSaveStatus === 'saving' ? t('travel.planner.autoSaving') : autoSaveStatus === 'saved' ? t('travel.planner.autoSaved') : t('travel.planner.autoSaveFail') }}
        </span>
        <el-segmented v-if="!isSplit" v-model="editMode" size="small"
          :options="[
            { label: t('travel.planner.form'), value: 'form' },
            { label: t('travel.planner.map'), value: 'map' },
          ]" />
        <el-dropdown size="small" trigger="click" @command="(cmd: string) => cmd === 'json' ? exportJSON() : cmd === 'csv' ? exportCSV() : exportICS()">
          <el-button size="small">{{ t('travel.planner.exportBtn') }}</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">{{ t('travel.planner.exportJson') }}</el-dropdown-item>
              <el-dropdown-item command="csv">{{ t('travel.planner.exportCsv') }}</el-dropdown-item>
              <el-dropdown-item command="ics">{{ t('travel.planner.exportIcs') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button size="small" @click="handleShare">{{ t('travel.planner.share') }}</el-button>
        <el-button v-if="itinerary.shortCode" size="small" @click="nav.redirectTo(`/travel/v/${itinerary.shortCode}`)">{{ t('travel.planner.preview') }}</el-button>
        <el-tooltip :content="itinerary.challenge ? t('travel.planner.accessCodeSet') : t('travel.planner.noAccessCode')" placement="bottom">
          <el-button size="small" @click="openPrivacyDialog">
            {{ itinerary.challenge ? '🔒' : '🔓' }}
          </el-button>
        </el-tooltip>
        <el-button v-if="!isMobile" type="primary" size="small" :loading="saving" @click="handleSave">{{ t('travel.planner.save') }}</el-button>
      </div>
    </div>

    <!-- Trip header -->
    <div class="planner-header">
      <el-input v-model="itinerary.sessionTitle" class="title-input" :placeholder="t('travel.planner.tripTitle')" :border="false" />
      <div class="header-meta">
        <el-input v-model="itinerary.destination" :placeholder="t('travel.planner.destination')" size="small" style="width: 200px" />
        <el-date-picker :model-value="itinerary.itineraryDateRaw" type="daterange" :range-separator="t('travel.list.dialog.to')"
          :start-placeholder="t('travel.planner.start')" :end-placeholder="t('travel.planner.end')" size="small" value-format="YYYY-MM-DD"
          @update:model-value="(v: string[]) => itineraryStore.onItineraryDateSelection(v)" />
        <el-input-number v-model="itinerary.numberOfPax" :min="1" size="small" style="width: 110px" :placeholder="t('travel.planner.pax')" />
      </div>
    </div>

    <!-- Draft banner -->
    <div v-if="isDraft" class="draft-banner">
      🔒 {{ t('travel.planner.draftBanner') }}
      <el-button size="small" type="primary" @click="layoutStore.loginDialog.setTrue()">{{ t('nav.login') }}</el-button>
    </div>

    <!-- Split layout: content left, map right -->
    <div class="planner-layout">

    <!-- Content panel: always visible on desktop, hidden on mobile when in map mode -->
    <div class="planner-content" v-show="isSplit || editMode !== 'map'">

    <!-- Loading -->
    <div v-if="loading" class="planner-loading">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- ── FORM MODE ─────────────────────────────────────────────────────── -->
    <div v-else-if="editMode === 'form'" class="form-mode">

      <!-- Empty state -->
      <EmptyState v-if="groupedByDate.length === 0" icon="🗺️" :title="t('travel.planner.noItems')">
        <el-button type="primary" @click="openAddDrawer()">{{ t('travel.planner.addFirstItem') }}</el-button>
      </EmptyState>

      <!-- Day groups -->
      <div v-else>
        <div class="day-group-controls">
          <el-button link size="small" @click="allCollapsed ? expandAll() : collapseAll()">
            {{ allCollapsed ? '↕ ' + t('travel.viewer.expandAll') : '↕ ' + t('travel.viewer.collapseAll') }}
          </el-button>
        </div>
        <div v-for="group in groupedByDate" :key="group.date" class="day-group">
          <div class="day-group-header" @click="toggleDay(group.date)">
            <div v-if="group.dayNumber !== null" class="day-badge">{{ group.dayNumber }}</div>
            <div class="day-label">{{ formatGroupDate(group.date) }}</div>
            <span class="day-item-count" v-if="collapsedDays.has(group.date)">{{ group.items.length }} {{ group.items.length === 1 ? t('travel.viewer.item') : t('travel.viewer.items') }}</span>
            <span class="day-chevron">{{ collapsedDays.has(group.date) ? '›' : '⌄' }}</span>
          </div>

          <div v-show="!collapsedDays.has(group.date)" class="agenda-cards">
            <div v-for="item in group.items" :key="item.id ?? item._localIndex" class="agenda-card"
              :class="(item.id && !item._isDirty) ? 'card--saved' : 'card--new'">
              <div class="card-icon">{{ getCategoryEmoji(item.category) }}</div>
              <div class="card-body">
                <div class="card-title">{{ item.title || t('travel.viewer.untitled') }}</div>
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
                  <el-tooltip :content="t('travel.planner.editTooltip')" placement="top">
                    <el-button circle size="small" @click="openEditDrawer(item)">
                      <span style="font-size:0.72rem">✏️</span>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip :content="t('travel.planner.deleteTooltip')" placement="top">
                    <el-button circle size="small" @click="removeAgendaItem(String(item.id ?? item._localIndex))">
                      <span style="font-size:0.72rem">🗑️</span>
                    </el-button>
                  </el-tooltip>
                </div>
                <div class="card-save-status">
                  <span v-if="!item.id || item._isDirty" class="status--new">{{ t('travel.planner.unsaved') }}</span>
                  <span v-else class="status--saved">{{ t('travel.planner.saved') }}</span>
                </div>
              </div>
            </div>
          </div>

          <button v-show="!collapsedDays.has(group.date)" class="add-to-day-btn" @click="openAddDrawer(group.date !== '__tbc__' ? group.date : '')">
            {{ group.dayNumber !== null ? t('travel.planner.addToDay', { n: group.dayNumber }) : t('travel.planner.addToDateTbc') }}
          </button>
        </div>

        <div class="form-add-global">
          <el-button @click="openAddDrawer()">{{ t('travel.planner.addItem') }}</el-button>
        </div>
      </div>
    </div>

      <!-- ── Bookings Section ──────────────────────────────────────────────── -->
      <div class="bookings-section">
        <div class="bookings-header" @click="bookingsCollapsed = !bookingsCollapsed">
          <div class="bookings-header-left">
            <span class="bookings-title">{{ t('travel.planner.bookings') }}</span>
            <div class="bookings-pills">
              <span class="booking-pill">SGD {{ bookingTotal.toFixed(2) }}</span>
              <span class="booking-pill">{{ bookingBookedCount }} / {{ (itinerary.bookings ?? []).length }} {{ t('travel.viewer.booked') }}</span>
            </div>
          </div>
          <div class="bookings-header-right">
            <div class="pax-names-editor" @click.stop>
              <template v-if="editingPaxNames">
                <el-input
                  v-model="paxNamesInput"
                  size="small"
                  :placeholder="t('travel.planner.paxPlaceholder')"
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
            {{ t('travel.planner.noBookings') }}
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
                  <el-tag v-if="booking.booked" type="success" size="small" effect="light">{{ t('travel.viewer.booked') }}</el-tag>
                  <el-tag v-else type="info" size="small" effect="light">{{ t('travel.viewer.pending') }}</el-tag>
                </div>
                <div class="booking-card-meta">
                  <span v-if="booking.remarks">📍 {{ booking.remarks }}</span>
                  <span v-if="booking.price != null">SGD {{ booking.price.toFixed(2) }}</span>
                  <span v-if="booking.nights">{{ booking.nights }}{{ t('travel.viewer.nights') }}</span>
                </div>
                <div class="booking-card-actions">
                  <el-button size="small" @click="openEditBookingDrawer(booking)">{{ t('travel.planner.editTooltip') }}</el-button>
                  <el-button size="small" type="danger" plain @click="onBookingDelete(booking)">{{ t('travel.planner.deleteTooltip') }}</el-button>
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
              <el-table-column :label="t('travel.viewer.tableItem')" min-width="160">
                <template #default="{ row }">
                  <a v-if="row.link" :href="row.link" target="_blank" class="booking-link">{{ row.item }}</a>
                  <span v-else>{{ row.item }}</span>
                </template>
              </el-table-column>
              <el-table-column :label="t('travel.viewer.tableRemarks')" min-width="80">
                <template #default="{ row }">
                  <span v-if="row.remarks">{{ row.remarks }}</span>
                  <span v-else class="dim">—</span>
                </template>
              </el-table-column>
              <el-table-column :label="t('travel.viewer.tablePayment')" width="100">
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
              <el-table-column :label="t('travel.viewer.tableTotal')" width="80">
                <template #default="{ row }">
                  <span v-if="row.price != null">{{ row.price.toFixed(2) }}</span>
                  <span v-else class="dim">—</span>
                </template>
              </el-table-column>
              <el-table-column :label="t('travel.viewer.tableDates')" width="150">
                <template #default="{ row }">
                  <span v-if="row.startDate || row.endDate">
                    {{ row.startDate ?? '' }}<template v-if="row.startDate && row.endDate"> → </template>{{ row.endDate ?? '' }}
                    <template v-if="row.nights"> ({{ row.nights }}{{ t('travel.viewer.nights') }})</template>
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

      <!-- ── Packing Section ───────────────────────────────────────────────── -->
      <div class="bookings-section" style="margin-top: 16px;">
        <div class="bookings-header" @click="packingCollapsed = !packingCollapsed">
          <div class="bookings-header-left">
            <span class="bookings-title">{{ t('travel.packing.title') }}</span>
            <div class="bookings-pills" v-if="(itinerary.packingItems ?? []).length > 0">
              <span class="booking-pill">
                {{ t('travel.packing.progress', { packed: packingPackedCount, total: (itinerary.packingItems ?? []).length }) }}
              </span>
            </div>
          </div>
          <div class="bookings-header-right">
            <el-icon class="collapse-icon" :class="{ 'is-collapsed': packingCollapsed }">
              <arrow-down />
            </el-icon>
          </div>
        </div>

        <div v-show="!packingCollapsed">
          <!-- Progress bar -->
          <div class="packing-progress" style="padding: 10px 16px 0;" v-if="(itinerary.packingItems ?? []).length > 0">
            <div class="packing-progress-bar">
              <div
                class="packing-progress-fill"
                :style="{ width: ((itinerary.packingItems ?? []).length ? packingPackedCount / (itinerary.packingItems ?? []).length * 100 : 0) + '%' }"
              />
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="(itinerary.packingItems ?? []).length === 0" class="bookings-empty">
            {{ t('travel.packing.noItems') }}
          </div>

          <!-- Items by category -->
          <div v-else class="packing-categories" style="padding: 12px 16px;">
            <div v-for="group in packingItemsByCategory" :key="group.cat.key" class="packing-category-group">
              <div class="packing-cat-heading">{{ group.cat.emoji }} {{ t(group.cat.labelKey) }}</div>
              <div class="packing-item"
                v-for="item in group.items"
                :key="item._localIndex ?? item.id"
              >
                <button
                  class="packing-check"
                  :class="{ 'packing-check--packed': item.packed }"
                  @click="togglePackingItem(item)"
                  type="button"
                >
                  <span v-if="item.packed">✓</span>
                </button>
                <span class="packing-item-label" :class="{ 'packing-item-label--packed': item.packed }">
                  {{ item.label }}
                </span>
                <span v-if="item.quantity" class="packing-qty">×{{ item.quantity }}</span>
                <div class="packing-item-actions">
                  <el-button circle size="small" @click="openEditPackingDrawer(item)">
                    <span style="font-size:0.72rem">✏️</span>
                  </el-button>
                  <el-button circle size="small" @click="removePackingItem(item)">
                    <span style="font-size:0.72rem">🗑️</span>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="bookings-add-row">
            <el-button size="small" @click="openAddPackingDrawer">{{ t('travel.packing.addItem') }}</el-button>
          </div>
        </div>
      </div>

    </div><!-- end .planner-content -->

    <!-- Always-mounted map panel: sidebar on desktop, full-screen on mobile map mode -->
    <div class="planner-map-panel" :class="{ 'planner-map-panel--fullscreen': isMapFullscreen }" v-show="editMode === 'map' || isSplit">
      <TravelMapView
        :agenda-items="itinerary.agendaItems ?? []"
        :fullscreen="isMapFullscreen"
        @toggle-fullscreen="isMapFullscreen = !isMapFullscreen"
      />
    </div>

    </div><!-- end .planner-layout -->

    </template>
  </div>

  <!-- Floating action bar -->
  <Teleport to="body">
    <div class="mobile-fab-bar">
      <el-button type="primary" size="small" :loading="saving" @click="handleSave">Save</el-button>
      <span class="fab-divider"></span>
      <el-button
        v-if="editMode === 'form' && groupedByDate.length > 0"
        size="small"
        @click="allCollapsed ? expandAll() : collapseAll()"
      >{{ allCollapsed ? '↕ Expand' : '↕ Collapse' }}</el-button>
      <el-button size="small" @click="scrollToTop">↑ Top</el-button>
    </div>
  </Teleport>

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
    @sync="onDrawerSync"
    @uploading="(v: boolean) => (drawerUploading = v)"
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

  <PackingDrawer
    v-model="packingDrawerVisible"
    :item="packingDrawerItem"
    :is-new="packingDrawerIsNew"
    :drawer-direction="drawerDirection"
    :drawer-size="drawerSize"
    @save="onPackingDrawerSave"
    @cancel="packingDrawerVisible = false"
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

/* ── Split layout ── */
.planner-layout {
  display: flex;
  gap: 16px;
  flex: 1;
  align-items: flex-start;
  min-height: 0;
}

.planner-content {
  flex: 1;
  min-width: 0;
}

.planner-map-panel {
  width: 400px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  position: sticky;
  top: 16px;
  height: calc(100vh - 220px);
  min-height: 400px;
}

.planner-map-panel--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 2000;
  width: 100% !important;
  height: 100% !important;
  border-radius: 0 !important;
  border: none !important;
}

@media (max-width: 900px) {
  .planner-layout {
    display: block;
  }
  .planner-map-panel {
    width: 100%;
    position: static;
    height: 55vh;
    max-height: 480px;
    margin-top: 16px;
    border-radius: 10px;
  }
}

/* ── Form mode ── */
.form-mode {
  flex: 1;
}

/* Day groups */
.day-group-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

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

.mobile-fab-bar {
  position: fixed;
  bottom: max(24px, env(safe-area-inset-bottom, 24px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 8px 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  z-index: 100;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}

.fab-divider {
  width: 1px;
  height: 16px;
  background: var(--color-border);
  align-self: center;
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

  .planner-topbar {
    flex-wrap: wrap;
  }

  .planner-actions {
    width: 100%;
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

/* ── Auto-save status ── */
.autosave-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.autosave-status--saving {
  color: var(--color-text);
  opacity: 0.55;
}

.autosave-status--saved {
  color: var(--el-color-success);
}

.autosave-status--error {
  color: var(--el-color-danger);
}

/* ── Draft banner ── */
.draft-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: color-mix(in srgb, var(--el-color-warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-warning) 30%, transparent);
  border-radius: 8px;
  font-size: 0.83rem;
  color: var(--color-text);
}

.packing-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.packing-progress-label {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.65;
}

.packing-progress-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--color-border);
  overflow: hidden;
}

.packing-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--el-color-primary);
  transition: width 0.3s ease;
}

.packing-categories {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.packing-category-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.packing-cat-heading {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.4;
  padding: 4px 0;
}

.packing-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-soft);
}

.packing-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.packing-check--packed {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
}

.packing-item-label {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text);
}

.packing-item-label--packed {
  text-decoration: line-through;
  opacity: 0.45;
}

.packing-qty {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.55;
  background: var(--color-background-mute);
  padding: 2px 7px;
  border-radius: 10px;
}

.packing-item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.packing-item:hover .packing-item-actions {
  opacity: 1;
}

.packing-add-row {
  padding-top: 4px;
}
</style>
