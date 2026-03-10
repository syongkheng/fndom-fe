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
import { useTravelDayGroups } from '@/composables/useTravelDayGroups'
import { useTravelExport } from '@/composables/useTravelExport'
import { useCityLabel } from '@/composables/useCityLabel'

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

// Table mode (el-table-v2) doesn't work on mobile — force Form mode
watchEffect(() => { if (isMobile.value) editMode.value = 'form' })

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
        <el-segmented v-if="!isMobile" v-model="editMode" size="small"
          :options="[{ label: '📋 Form', value: 'form' }, { label: '⊞ Table', value: 'table' }]" />
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
</style>
