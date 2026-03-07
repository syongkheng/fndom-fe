<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNav } from '@/hooks/useNav'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { getCategoryEmoji } from '@/constants/TravelCategories'
import { HiearchicalCountry } from '@/constants/HierarchicalCountry'

const route = useRoute()
const nav = useNav()

const shortCode = route.params.shortCode as string

interface AgendaRow {
  id?: number
  category?: string
  title: string
  desc?: string | null
  // Both camelCase (new) and snake_case (existing DB records) are handled
  city?: string | null
  cityRaw?: string[] | null
  city_raw?: string | null
  startTime?: string | number | null
  start_time?: string | number | null
  endTime?: string | number | null
  unknownTime?: boolean | number | null
  unknown_time?: boolean | number | null
  date?: string | null
  budget?: number | null
}

interface ItineraryData {
  sessionTitle: string
  destination?: string
  startDate?: number
  endDate?: number
  numberOfPax?: number
  agendaItems: AgendaRow[]
}

const itinerary = ref<ItineraryData | null>(null)
const loading = ref(true)
const error = ref(false)

// ── Challenge gate ────────────────────────────────────────────────────────────
const challengeRequired = ref(false)
const challengeVerified = ref(false)
const challengeInput = ref('')
const challengeError = ref(false)
const verifyingChallenge = ref(false)

const onChallengeInput = (val: string) => {
  challengeInput.value = val.replace(/\D/g, '').slice(0, 6)
  challengeError.value = false
}

const verifyChallenge = async () => {
  if (challengeInput.value.length !== 6) {
    challengeError.value = true
    return
  }
  verifyingChallenge.value = true
  challengeError.value = false
  const res = await HttpClient.post(ApiRoute.ITINERARY.CHECK_PERMISSION, {
    shortCode,
    challenge: challengeInput.value,
  }).catch(() => null)
  verifyingChallenge.value = false
  if (res?.data?.data) {
    itinerary.value = res.data.data
    challengeVerified.value = true
    challengeRequired.value = false
  } else {
    challengeError.value = true
  }
}

onMounted(async () => {
  const res = await HttpClient.get(ApiRoute.ITINERARY.RETRIEVE_BY_SHORT_CODE(shortCode)).catch(() => null)
  if (res?.data?.data) {
    if (res.data.data.hasChallenge) {
      challengeRequired.value = true
    } else {
      itinerary.value = res.data.data
    }
  } else {
    error.value = true
  }
  loading.value = false
})

// ── Date helpers ─────────────────────────────────────────────────────────────
// Normalise any date value (ISO string, YYYY-MM-DD, timestamp) to local YYYY-MM-DD
const toLocalDateKey = (date: any): string => {
  if (!date) return '__tbc__'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '__tbc__'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatHeaderRange = (startDate?: number, endDate?: number) => {
  if (!startDate) return null
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return endDate ? `${fmt(startDate)} – ${fmt(endDate)}` : fmt(startDate)
}

const formatDate = (dateKey: string) => {
  if (dateKey === '__tbc__') return 'Date TBC'
  const d = new Date(`${dateKey}T12:00:00`)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Agenda helpers ────────────────────────────────────────────────────────────
const toHHMM = (val: any): string | null => {
  if (!val) return null
  if (typeof val === 'string') return val.slice(0, 5)
  const d = new Date(val as number)
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const getTime = (item: AgendaRow): string | null => {
  const unknown = item.unknownTime ?? item.unknown_time
  const st = item.startTime ?? item.start_time
  if (unknown || !st) return null
  const start = toHHMM(st)
  if (!start) return null
  const et = item.endTime ?? (item as any).end_time
  const end = et ? toHHMM(et) : null
  return end ? `${start} – ${end}` : start
}

const getItemTimeMinutes = (item: AgendaRow): number => {
  const unknown = item.unknownTime ?? item.unknown_time
  const st = item.startTime ?? item.start_time
  if (unknown || !st || typeof st !== 'string') return Infinity
  const [h, m] = st.split(':').map(Number)
  return isNaN(h) || isNaN(m) ? Infinity : h * 60 + m
}

const resolveCityLabel = (valuePath: string[]): string | null => {
  if (!valuePath?.length) return null
  let options: any[] = HiearchicalCountry as unknown as any[]
  let label: string | null = null
  for (const val of valuePath) {
    const found = options.find((o) => o.value === val)
    if (!found) return valuePath[valuePath.length - 1]
    label = found.label
    options = found.children ?? []
  }
  return label
}

const getCity = (item: AgendaRow): string | null => {
  const raw: string[] | null =
    item.cityRaw?.length
      ? item.cityRaw
      : (() => {
          const src = (item as any).city_raw ?? item.city
          if (!src) return null
          try { return JSON.parse(src) } catch { return null }
        })()
  return resolveCityLabel(raw ?? [])
}

// ── Grouping ─────────────────────────────────────────────────────────────────
const groupedByDate = computed(() => {
  if (!itinerary.value?.agendaItems?.length) return []

  const sorted = [...itinerary.value.agendaItems].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  const map = new Map<string, AgendaRow[]>()
  for (const item of sorted) {
    const key = toLocalDateKey(item.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }

  // Within each day: timed items sorted by start_time asc, then untimed items sorted by id asc
  map.forEach((dayItems) => {
    dayItems.sort((a, b) => {
      const ta = getItemTimeMinutes(a)
      const tb = getItemTimeMinutes(b)
      if (ta !== tb) return ta - tb
      // Both untimed — preserve insertion order by id
      return (a.id ?? 0) - (b.id ?? 0)
    })
  })

  let dayNumber = 0
  return Array.from(map.entries()).map(([date, items]) => {
    const isTbc = date === '__tbc__'
    if (!isTbc) dayNumber++
    return { date, items, dayNumber: isTbc ? null : dayNumber }
  })
})
</script>

<template>
  <!-- Challenge gate -->
  <el-dialog
    v-model="challengeRequired"
    title="Protected Itinerary"
    width="340px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    align-center
  >
    <div class="gate-body">
      <div class="gate-icon">🔒</div>
      <p class="gate-desc">This itinerary is protected. Enter the 6-digit access code to view it.</p>
      <el-input
        :model-value="challengeInput"
        placeholder="000000"
        maxlength="6"
        size="large"
        :status="challengeError ? 'error' : ''"
        style="letter-spacing: 0.3em; font-size: 1.2rem; text-align: center;"
        @input="onChallengeInput"
        @keyup.enter="verifyChallenge"
      />
      <div v-if="challengeError" class="gate-error">Incorrect code. Please try again.</div>
    </div>
    <template #footer>
      <el-button
        type="primary"
        style="width: 100%"
        :loading="verifyingChallenge"
        :disabled="challengeInput.length !== 6"
        @click="verifyChallenge"
      >
        Unlock
      </el-button>
    </template>
  </el-dialog>

  <div class="viewer-root">

    <!-- Loading -->
    <div v-if="loading" class="viewer-loading">
      <el-skeleton :rows="6" animated style="max-width: 640px; margin: 0 auto;" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="viewer-error">
      <div class="error-icon">🗺️</div>
      <h2 class="error-title">Trip not found</h2>
      <p class="error-desc">This itinerary link may have expired or been removed.</p>
      <el-button type="primary" @click="nav.redirectTo('/travel')">Go to My Trips</el-button>
    </div>

    <!-- Content -->
    <div v-else-if="itinerary && (!challengeRequired || challengeVerified)" class="viewer-wrap">

      <!-- Trip header -->
      <header class="trip-header">
        <p v-if="itinerary.destination" class="trip-destination">{{ itinerary.destination }}</p>
        <h1 class="trip-title">{{ itinerary.sessionTitle }}</h1>
        <div class="trip-header-meta">
          <span v-if="formatHeaderRange(itinerary.startDate, itinerary.endDate)" class="meta-pill">
            📅 {{ formatHeaderRange(itinerary.startDate, itinerary.endDate) }}
          </span>
          <span v-if="itinerary.numberOfPax" class="meta-pill">
            👥 {{ itinerary.numberOfPax }} traveller{{ itinerary.numberOfPax === 1 ? '' : 's' }}
          </span>
        </div>
      </header>

      <!-- Empty agenda -->
      <div v-if="groupedByDate.length === 0" class="empty-agenda">
        <p>No agenda items yet.</p>
      </div>

      <!-- Timeline -->
      <div v-else class="timeline">
        <div v-for="(group, gi) in groupedByDate" :key="group.date" class="timeline-day">

          <!-- Day heading -->
          <div class="day-heading">
            <div v-if="group.dayNumber !== null" class="day-badge">{{ group.dayNumber }}</div>
            <div class="day-label">{{ formatDate(group.date) }}</div>
          </div>

          <!-- Items -->
          <div class="day-items">
            <div
              v-for="(item, ii) in group.items"
              :key="item.id ?? ii"
              class="timeline-item"
            >
              <!-- Spine: category emoji + connecting line -->
              <div class="item-spine">
                <div class="item-emoji">{{ getCategoryEmoji(item.category) }}</div>
                <div
                  v-if="ii < group.items.length - 1 || gi < groupedByDate.length - 1"
                  class="item-line"
                />
              </div>

              <!-- Content -->
              <div class="item-content">
                <div class="item-meta-row">
                  <span v-if="getTime(item)" class="item-time">{{ getTime(item) }}</span>
                  <span v-if="getCity(item)" class="item-city">{{ getCity(item) }}</span>
                  <span v-if="item.category" class="item-category-tag">{{ item.category }}</span>
                </div>
                <div class="item-title">{{ item.title || 'Untitled' }}</div>
                <div v-if="item.desc" class="item-desc">{{ item.desc }}</div>
                <div v-if="item.budget" class="item-budget">
                  <span class="budget-pill">💰 {{ item.budget.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Challenge gate ── */
.gate-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}

.gate-icon {
  font-size: 2rem;
}

.gate-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.75;
  line-height: 1.55;
  margin: 0;
}

.gate-error {
  font-size: 0.78rem;
  color: var(--el-color-danger);
  margin-top: -6px;
}

.viewer-root {
  width: 100%;
  min-height: 100%;
  padding-bottom: 48px;
}

/* ── States ── */
.viewer-loading {
  padding: 32px 16px;
}

.viewer-error {
  text-align: center;
  padding: 60px 24px;
}

.error-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.error-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 8px;
}

.error-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 20px;
}

/* ── Wrapper ── */
.viewer-wrap {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 4px;
}

/* ── Trip header ── */
.trip-header {
  padding: 24px 0 28px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 32px;
}

.trip-destination {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 6px;
}

.trip-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  line-height: 1.2;
  margin-bottom: 12px;
}

.trip-header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-pill {
  font-size: 0.8rem;
  color: var(--color-text);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 3px 10px;
}

/* ── Empty ── */
.empty-agenda {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.5;
  padding: 20px 0;
}

/* ── Timeline ── */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.timeline-day {
  display: flex;
  flex-direction: column;
}

/* Day heading */
.day-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.day-badge {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.day-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-heading);
}

/* Items */
.day-items {
  padding-left: 4px;
}

.timeline-item {
  display: flex;
  gap: 14px;
}

/* Spine */
.item-spine {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 36px;
}

.item-emoji {
  font-size: 1.3rem;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 1px;
}

.item-line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  background: var(--color-border);
  margin-top: 6px;
  margin-bottom: 2px;
  border-radius: 1px;
}

/* Content */
.item-content {
  flex: 1;
  padding-bottom: 22px;
  min-width: 0;
}

.item-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
  flex-wrap: wrap;
}

.item-time {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--el-color-primary);
  font-variant-numeric: tabular-nums;
}

.item-city {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.55;
}

.item-category-tag {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  border-radius: 4px;
  padding: 1px 6px;
  opacity: 0.9;
}

.item-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
  line-height: 1.35;
  margin-bottom: 4px;
}

.item-desc {
  font-size: 0.83rem;
  color: var(--color-text);
  opacity: 0.7;
  line-height: 1.55;
}

.item-budget {
  margin-top: 6px;
}

.budget-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 2px 10px;
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .trip-title {
    font-size: 1.4rem;
  }

  .viewer-wrap {
    padding: 0;
  }
}
</style>
