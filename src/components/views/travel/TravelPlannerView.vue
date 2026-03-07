<script lang="ts" setup>
import { ref, computed, onMounted, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useNav } from '@/hooks/useNav'
import { useItineraryStore } from '@/stores/itinerary'
import { useBreakpointManager } from '@/hooks/useBreakpointManager'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { createTravelPlannerVTableColumns } from './TravelPlannerVTableColumns'
import { HiearchicalCountry } from '@/constants/HierarchicalCountry'
import { TRAVEL_CATEGORIES, getCategoryEmoji } from '@/constants/TravelCategories'
import type { CascaderValue, CascaderOption } from 'element-plus'
import type { AgendaItem } from '@/interfaces/forms/itinerary/AgendaItem'

const route = useRoute()
const nav = useNav()
const itineraryStore = useItineraryStore()
const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { itinerary, loadingStage } = storeToRefs(itineraryStore)
const { isAuthenticated } = storeToRefs(authStore)

const sessionId = route.params.sessionId as string

const loading = ref(true)
const saving = ref(false)
const editMode = ref<'form' | 'table'>('form')

// ── Responsive drawer ─────────────────────────────────────────────────────────
const { width } = useBreakpointManager()
const isMobile = computed(() => width.value <= 600)
const drawerDirection = computed(() => isMobile.value ? 'btt' : 'rtl')
const drawerSize = computed(() => isMobile.value ? '92%' : '420px')

// Table mode (el-table-v2) doesn't work on mobile — force Form mode
watchEffect(() => { if (isMobile.value) editMode.value = 'form' })

// ── Drawer state ──────────────────────────────────────────────────────────────
const drawerVisible = ref(false)
const drawerIsNew = ref(false)
const drawerEditKey = ref<string | undefined>()

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

const drawerForm = ref<AgendaItem>(makeBlankDraft())

const openAddDrawer = (presetDate?: string) => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  drawerIsNew.value = true
  drawerEditKey.value = undefined
  // Always normalise to a clean local YYYY-MM-DD so the date picker shows
  // the right day regardless of what format came from the backend.
  const normalised = presetDate ? toLocalDateKey(presetDate) : ''
  drawerForm.value = makeBlankDraft(normalised === '__tbc__' ? '' : normalised)
  drawerVisible.value = true
}

const openEditDrawer = (item: AgendaItem) => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  drawerIsNew.value = false
  drawerEditKey.value = item.id ?? item._localIndex
  drawerForm.value = { ...item }
  drawerVisible.value = true
}

const saveDrawerItem = () => {
  if (!drawerForm.value.title.trim()) {
    ElMessage.warning('Please enter a title.')
    return
  }
  if (drawerIsNew.value) {
    itinerary.value.agendaItems.push({ ...drawerForm.value })
  } else {
    const idx = itinerary.value.agendaItems.findIndex(
      (i) => (i.id ?? i._localIndex) === drawerEditKey.value,
    )
    if (idx !== -1) itinerary.value.agendaItems[idx] = { ...drawerForm.value }
  }
  drawerVisible.value = false
}

const drawerCityChange = (val: CascaderValue | null | undefined) => {
  drawerForm.value.city = val ? JSON.stringify(val) : ''
  drawerForm.value.cityRaw = (val as string[] | null) ?? []
}

const drawerDisabledDate = (time: Date) => {
  const { startDate, endDate, unknownDate } = itinerary.value
  if (unknownDate || (!startDate && !endDate)) return false
  const t = time.getTime()
  const toMid = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime() }
  if (startDate && t < toMid(startDate)) return true
  if (endDate && t > toMid(endDate)) return true
  return false
}

// ── Form mode helpers ─────────────────────────────────────────────────────────

// Converts any date value (ISO string, YYYY-MM-DD, timestamp, Date) to a
// local YYYY-MM-DD string so that dates from the backend, table mode, and
// drawer all group together correctly.
const toLocalDateKey = (date: any): string => {
  if (!date) return '__tbc__'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '__tbc__'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const getCardTime = (item: AgendaItem) => {
  if (item.unknownTime || !item.startTime) return null
  const st = item.startTime as unknown as string | number
  if (typeof st === 'string') return st.slice(0, 5)
  const d = new Date(st)
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const getCardCity = (item: AgendaItem) => {
  if (item.cityRaw && item.cityRaw.length > 0) return item.cityRaw[item.cityRaw.length - 1]
  if (item.city) {
    try {
      const parsed = JSON.parse(item.city)
      return Array.isArray(parsed) ? parsed[parsed.length - 1] : item.city
    } catch { return item.city }
  }
  return null
}

const groupedByDate = computed(() => {
  const items = itinerary.value.agendaItems
  if (!items?.length) return []

  // Sort by timestamp for correct chronological order
  const sorted = [...items].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(a.date as any).getTime() - new Date(b.date as any).getTime()
  })

  // Normalise every date to a local YYYY-MM-DD key so that ISO strings from
  // the backend, date strings from the table, and strings from the drawer all
  // collapse to the same group.
  const map = new Map<string, AgendaItem[]>()
  for (const item of sorted) {
    const key = toLocalDateKey(item.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }

  let dayNumber = 0
  return Array.from(map.entries()).map(([date, items]) => {
    const isTbc = date === '__tbc__'
    if (!isTbc) dayNumber++
    return { date, items, dayNumber: isTbc ? null : dayNumber }
  })
})

const formatGroupDate = (dateKey: string) => {
  if (dateKey === '__tbc__') return 'Date TBC'
  // Add T12:00:00 so parsing is never affected by UTC-midnight timezone shifts
  const d = new Date(`${dateKey}T12:00:00`)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
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
    challengeDraft.value = ''
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
const challengeDraft = ref('')
const privacySeenKey = `itinerary-privacy-seen-${sessionId}`

const openPrivacyDialog = () => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  challengeDraft.value = itinerary.value.challenge ?? ''
  privacyDialogVisible.value = true
}

const onChallengeInput = (val: string) => {
  challengeDraft.value = val.replace(/\D/g, '').slice(0, 6)
}

const saveChallenge = () => {
  if (challengeDraft.value && challengeDraft.value.length !== 6) {
    ElMessage.warning('Access code must be exactly 6 digits.')
    return
  }
  itinerary.value.challenge = challengeDraft.value || undefined
  sessionStorage.setItem(privacySeenKey, '1')
  privacyDialogVisible.value = false
  ElMessage.success(
    challengeDraft.value
      ? 'Access code set. Save your trip to apply.'
      : 'No access code set — trip remains public.',
  )
}

const skipPrivacy = () => {
  sessionStorage.setItem(privacySeenKey, '1')
  privacyDialogVisible.value = false
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
        <el-segmented v-if="!isMobile" v-model="editMode" size="small"
          :options="[{ label: '📋 Form', value: 'form' }, { label: '⊞ Table', value: 'table' }]" />
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
      <div v-if="groupedByDate.length === 0" class="form-empty">
        <div class="form-empty-icon">🗺️</div>
        <p class="form-empty-text">No agenda items yet.</p>
        <el-button type="primary" @click="openAddDrawer()">+ Add First Item</el-button>
      </div>

      <!-- Day groups -->
      <div v-else>
        <div v-for="group in groupedByDate" :key="group.date" class="day-group">
          <div class="day-group-header">
            <div v-if="group.dayNumber !== null" class="day-badge">{{ group.dayNumber }}</div>
            <div class="day-label">{{ formatGroupDate(group.date) }}</div>
          </div>

          <div class="agenda-cards">
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

          <button class="add-to-day-btn" @click="openAddDrawer(group.date !== '__tbc__' ? group.date : '')">
            + Add to {{ group.dayNumber !== null ? `Day ${group.dayNumber}` : 'Date TBC' }}
          </button>
        </div>

        <div class="form-add-global">
          <el-button @click="openAddDrawer()">+ Add Item</el-button>
        </div>
      </div>
    </div>

    <!-- ── TABLE MODE ────────────────────────────────────────────────────── -->
    <div v-else class="planner-table">
      <el-auto-resizer>
        <template #default="{ width, height }">
          <el-table-v2 :columns="columns" :data="tableData" :width="width" :height="height" border />
        </template>
      </el-auto-resizer>
    </div>

    </template>
  </div>

  <!-- ── PRIVACY DIALOG ───────────────────────────────────────────────── -->
  <el-dialog
    v-model="privacyDialogVisible"
    title="Trip Privacy"
    width="360px"
    :close-on-click-modal="false"
    align-center
  >
    <div class="privacy-dialog-body">
      <div class="privacy-warning">
        <span class="privacy-icon">🌐</span>
        <p>This trip is <strong>public by default</strong> — anyone with the share link can view it.</p>
      </div>
      <p class="privacy-hint">
        You can set a 6-digit numeric access code. Viewers will need this code to see your itinerary.
      </p>
      <div class="privacy-input-wrap">
        <el-input
          :model-value="challengeDraft"
          placeholder="e.g. 123456"
          maxlength="6"
          size="large"
          style="letter-spacing: 0.25em; font-size: 1.1rem; text-align: center;"
          :clearable="true"
          @input="onChallengeInput"
        />
        <div class="privacy-input-hint">Leave blank to keep the trip public</div>
      </div>
    </div>
    <template #footer>
      <div class="privacy-dialog-footer">
        <el-button @click="skipPrivacy">Skip for now</el-button>
        <el-button type="primary" @click="saveChallenge">
          {{ challengeDraft ? 'Set Access Code' : 'Keep Public' }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- ── DRAWER ─────────────────────────────────────────────────────────── -->
  <el-drawer v-model="drawerVisible" :title="drawerIsNew ? 'New Agenda Item' : 'Edit Item'" :direction="drawerDirection"
    :size="drawerSize">
    <div class="drawer-form">

      <!-- Category -->
      <div class="form-section">
        <div class="form-label">Category</div>
        <div class="category-grid">
          <button v-for="cat in TRAVEL_CATEGORIES" :key="cat.value" class="cat-btn"
            :class="{ active: drawerForm.category === cat.value }" @click="drawerForm.category = cat.value">
            <span class="cat-emoji">{{ cat.emoji }}</span>
            <span class="cat-label">{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Title -->
      <div class="form-section">
        <div class="form-label">Title <span class="req">*</span></div>
        <el-input v-model="drawerForm.title" placeholder="e.g. Lunch at local restaurant" size="large" />
      </div>

      <!-- Date -->
      <div class="form-section">
        <div class="form-label">Date</div>
        <el-date-picker v-model="drawerForm.date" type="date" placeholder="Select date" style="width: 100%"
          value-format="YYYY-MM-DD" :disabled-date="drawerDisabledDate"
          :default-value="itinerary.startDate ? new Date(itinerary.startDate) : undefined" size="large" />
      </div>

      <!-- City -->
      <div class="form-section">
        <div class="form-label">City</div>
        <el-cascader :model-value="drawerForm.cityRaw" :options="HiearchicalCountry as unknown as CascaderOption[]"
          placeholder="Select city" style="width: 100%" :props="{ checkStrictly: true }" clearable size="large"
          @change="drawerCityChange" />
      </div>

      <!-- Time -->
      <div class="form-section">
        <div class="form-label">Time</div>
        <div class="time-row">
          <el-time-picker v-model="drawerForm.startTime" placeholder="Start" style="flex: 1" format="HH:mm"
            value-format="HH:mm" :disabled="drawerForm.unknownTime" size="large" />
          <span class="time-sep">–</span>
          <el-time-picker v-model="drawerForm.endTime" placeholder="End" style="flex: 1" format="HH:mm"
            value-format="HH:mm" :disabled="drawerForm.unknownTime" size="large" />
        </div>
        <el-checkbox v-model="drawerForm.unknownTime" style="margin-top: 6px">
          Time TBC
        </el-checkbox>
      </div>

      <!-- Notes -->
      <div class="form-section">
        <div class="form-label">Notes</div>
        <el-input v-model="drawerForm.desc" type="textarea" :rows="3" placeholder="Any notes or details..."
          size="large" />
      </div>

      <!-- Budget -->
      <div class="form-section">
        <div class="form-label">Budget</div>
        <el-input-number v-model="drawerForm.budget" :min="0" style="width: 100%" size="large" placeholder="0.00" />
      </div>

      <!-- Actions -->
      <div class="drawer-actions">
        <el-button style="flex: 1" @click="drawerVisible = false">Cancel</el-button>
        <el-button style="flex: 1" type="primary" @click="saveDrawerItem">
          {{ drawerIsNew ? 'Add Item' : 'Save Changes' }}
        </el-button>
      </div>

    </div>
  </el-drawer>
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

/* ── Table mode ── */
.planner-table {
  flex: 1;
  min-height: 400px;
}

/* ── Form mode ── */
.form-mode {
  flex: 1;
}

.form-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
}

.form-empty-icon {
  font-size: 2.4rem;
}

.form-empty-text {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.55;
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

/* ── Drawer form ── */
.drawer-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.drawer-actions {
  display: flex;
  gap: 8px;
  position: sticky;
  bottom: 0;
  padding: 16px 0 8px;
  background: var(--el-drawer-bg-color, var(--color-background-soft));
}

.form-section {
  margin-bottom: 18px;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 6px;
}

.req {
  color: #f87171;
}

/* Category grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}

.cat-btn:hover {
  border-color: var(--el-color-primary);
  background: var(--color-background-mute);
}

.cat-btn.active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.cat-emoji {
  font-size: 1.3rem;
  line-height: 1;
}

.cat-label {
  font-size: 0.68rem;
  color: var(--color-text);
  font-weight: 500;
}

/* Time row */
.time-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-sep {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.5;
  flex-shrink: 0;
}

/* ── Privacy dialog ── */
.privacy-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.privacy-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: color-mix(in srgb, var(--el-color-warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-warning) 30%, transparent);
  border-radius: 8px;
}

.privacy-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.privacy-warning p {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.5;
  margin: 0;
}

.privacy-hint {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  line-height: 1.55;
  margin: 0;
}

.privacy-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.privacy-input-hint {
  font-size: 0.74rem;
  color: var(--color-text);
  opacity: 0.5;
  text-align: center;
}

.privacy-dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
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
</style>
