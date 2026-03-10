<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNav } from '@/hooks/useNav'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { getCategoryEmoji } from '@/constants/TravelCategories'
import OtpInput from '@/components/common/OtpInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useTravelDayGroups } from '@/composables/useTravelDayGroups'
import { useTravelExport } from '@/composables/useTravelExport'
import { useCityLabel } from '@/composables/useCityLabel'

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
  viewCount?: number
  agendaItems: AgendaRow[]
}

const itinerary = ref<ItineraryData | null>(null)
const loading = ref(true)
const error = ref(false)

// ── Challenge gate ────────────────────────────────────────────────────────────
const challengeRequired = ref(false)
const challengeVerified = ref(false)
const challengeDigits = ref<string[]>(['', '', '', '', '', ''])
const challengeInput = computed(() => challengeDigits.value.join(''))
const challengeError = ref(false)
const verifyingChallenge = ref(false)
const otpRef = ref<{ focus: () => void } | null>(null)

watch(challengeRequired, (val) => {
  if (val) nextTick(() => otpRef.value?.focus())
})

const onOtpUpdate = (digits: string[]) => {
  challengeDigits.value = digits
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
    challengeDigits.value = ['', '', '', '', '', '']
    nextTick(() => otpRef.value?.focus())
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

// ── City label ────────────────────────────────────────────────────────────────
const { getCardCity: getCity } = useCityLabel()

// ── Date helpers ──────────────────────────────────────────────────────────────
const agendaItemsRef = computed(() => itinerary.value?.agendaItems ?? [])
const { collapsedDays, toggleDay, groupedByDate, formatDate, formatHeaderRange } = useTravelDayGroups(agendaItemsRef)

// ── Export ────────────────────────────────────────────────────────────────────
const { exportJSON, exportCSV } = useTravelExport(itinerary, groupedByDate, getCity)

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
      <OtpInput
        ref="otpRef"
        v-model="challengeDigits"
        :error="challengeError"
        @update:model-value="onOtpUpdate"
        @complete="verifyChallenge"
      />
      <div v-if="challengeError" class="gate-error">Incorrect code. Please try again.</div>
    </div>
    <template #footer>
      <el-button
        type="primary"
        style="width: 100%"
        :loading="verifyingChallenge"
        :disabled="challengeInput.length !== 6 || verifyingChallenge"
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
          <span v-if="itinerary.viewCount !== undefined" class="meta-pill">
            👁 {{ itinerary.viewCount }} view{{ itinerary.viewCount === 1 ? '' : 's' }}
          </span>
        </div>
        <div class="trip-header-actions">
          <el-dropdown trigger="click" @command="(cmd: string) => cmd === 'json' ? exportJSON() : exportCSV()">
            <el-button size="small">Export ↓</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="json">Export JSON</el-dropdown-item>
                <el-dropdown-item command="csv">Export CSV</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- Empty agenda -->
      <EmptyState v-if="groupedByDate.length === 0" icon="🗺️" title="No agenda items yet." />

      <!-- Timeline -->
      <div v-else class="timeline">
        <div v-for="(group, gi) in groupedByDate" :key="group.date" class="timeline-day">

          <!-- Day heading -->
          <div class="day-heading" @click="toggleDay(group.date)">
            <div v-if="group.dayNumber !== null" class="day-badge">{{ group.dayNumber }}</div>
            <div class="day-label">{{ formatDate(group.date) }}</div>
            <span class="day-item-count" v-if="collapsedDays.has(group.date)">{{ group.items.length }} item{{ group.items.length === 1 ? '' : 's' }}</span>
            <span class="day-chevron">{{ collapsedDays.has(group.date) ? '›' : '⌄' }}</span>
          </div>

          <!-- Items -->
          <div v-show="!collapsedDays.has(group.date)" class="day-items">
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

  <el-backtop target=".wrapper" :visibility-height="300" :right="24" :bottom="32" />
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

.trip-header-actions {
  margin-top: 14px;
}

.meta-pill {
  font-size: 0.8rem;
  color: var(--color-text);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 3px 10px;
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
  cursor: pointer;
  user-select: none;
}

.day-heading:hover .day-label {
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
