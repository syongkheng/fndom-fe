<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNav } from '@/hooks/useNav'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { getCategoryEmoji } from '@/constants/TravelCategories'
import OtpInput from '@/components/common/OtpInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TravelMapView from '@/components/views/travel/TravelMapView.vue'
import { useTravelDayGroups, type AgendaRow } from '@/composables/useTravelDayGroups'
import { useTravelExport } from '@/composables/useTravelExport'
import { useCityLabel } from '@/composables/useCityLabel'
import type { ItineraryBooking } from '@/interfaces/forms/itinerary/ItineraryBooking'
import { ArrowDown } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const nav = useNav()

const shortCode = route.params.shortCode as string


interface ItineraryData {
  sessionTitle: string
  destination?: string
  startDate?: number
  endDate?: number
  numberOfPax?: number
  viewCount?: number
  agendaItems: AgendaRow[]
  bookings?: ItineraryBooking[]
  paxNames?: string[]
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
    fetchFileBlobs(res.data.data.agendaItems ?? [])
  } else {
    challengeError.value = true
    challengeDigits.value = ['', '', '', '', '', '']
    nextTick(() => otpRef.value?.focus())
  }
}

const fileBlobs = ref<Map<string, string>>(new Map())

const fetchFileBlobs = async (items: AgendaRow[]) => {
  const allFiles = (items ?? []).flatMap((item: AgendaRow) => item.files ?? [])
  if (!allFiles.length) return
  await Promise.allSettled(
    allFiles.map(async (file: any) => {
      if (!file.uuid) return
      const res = await HttpClient.get(ApiRoute.FILE.GET(file.uuid)).catch(() => null)
      if (res?.data?.data?.blob) {
        fileBlobs.value.set(file.uuid, atob(res.data.data.blob))
      }
    })
  )
}

onMounted(async () => {
  const res = await HttpClient.get(ApiRoute.ITINERARY.RETRIEVE_BY_SHORT_CODE(shortCode)).catch(() => null)
  if (res?.data?.data) {
    if (res.data.data.hasChallenge) {
      challengeRequired.value = true
    } else {
      itinerary.value = res.data.data
      await fetchFileBlobs(res.data.data.agendaItems ?? [])
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
const { exportJSON, exportCSV, exportICS } = useTravelExport(itinerary, groupedByDate, getCity)

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

// ── Bookings ──────────────────────────────────────────────────────────────────
const BOOKING_EMOJI: Record<string, string> = {
  flight: '✈️',
  accommodation: '🏨',
  transport: '🚌',
  other: '📦',
}
const getBookingEmoji = (category?: string) => BOOKING_EMOJI[category ?? ''] ?? '📦'

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

const viewerPaxNames = computed(() => {
  if (itinerary.value?.paxNames?.length) return itinerary.value.paxNames
  const n = itinerary.value?.numberOfPax ?? 1
  if (n === 1) return ['Me']
  return Array.from({ length: n }, (_, i) => `Person ${i + 1}`)
})

const viewerBookings = computed(() => itinerary.value?.bookings ?? [])

const viewerBookingTotal = computed(() =>
  viewerBookings.value.reduce((sum, b) => sum + (b.price ?? 0), 0),
)

const viewerBookedCount = computed(() =>
  viewerBookings.value.filter((b) => b.booked).length,
)

const hasAccommodation = computed(() =>
  viewerBookings.value.some((b) => b.category === 'accommodation'),
)

const bookingsCollapsed = ref(false)

const ctaDismissed = ref(sessionStorage.getItem('fndom-cta-dismissed') === '1')
const dismissCta = () => {
  sessionStorage.setItem('fndom-cta-dismissed', '1')
  ctaDismissed.value = true
}

const allCollapsed = computed(() =>
  groupedByDate.value.length > 0 &&
  groupedByDate.value.every((g) => collapsedDays.value.has(g.date)),
)

function toggleAllDays() {
  if (allCollapsed.value) {
    collapsedDays.value = new Set()
  } else {
    collapsedDays.value = new Set(groupedByDate.value.map((g) => g.date))
  }
}

// ── Mobile ────────────────────────────────────────────────────────────────────
const isMobile = computed(() => window.innerWidth <= 600)
const { t } = useI18n()

</script>

<template>
  <!-- Challenge gate -->
  <el-dialog v-model="challengeRequired" :title="t('travel.viewer.protected')" width="340px" :close-on-click-modal="false"
    :close-on-press-escape="false" :show-close="false" align-center>
    <div class="gate-body">
      <div class="gate-icon">🔒</div>
      <p class="gate-desc">{{ t('travel.viewer.protectedDesc') }}</p>
      <OtpInput ref="otpRef" v-model="challengeDigits" :error="challengeError" @update:model-value="onOtpUpdate"
        @complete="verifyChallenge" />
      <div v-if="challengeError" class="gate-error">{{ t('travel.viewer.wrongCode') }}</div>
    </div>
    <template #footer>
      <el-button type="primary" style="width: 100%" :loading="verifyingChallenge"
        :disabled="challengeInput.length !== 6 || verifyingChallenge" @click="verifyChallenge">
        {{ t('travel.viewer.unlock') }}
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
      <h2 class="error-title">{{ t('travel.viewer.notFound') }}</h2>
      <p class="error-desc">{{ t('travel.viewer.notFoundDesc') }}</p>
      <el-button type="primary" @click="nav.redirectTo('/travel')">{{ t('travel.viewer.goToTrips') }}</el-button>
    </div>

    <!-- Hero map — full-bleed, outside viewer-wrap -->
    <div v-if="itinerary && (!challengeRequired || challengeVerified)" class="viewer-hero">
      <TravelMapView :agenda-items="(itinerary.agendaItems ?? []) as any" class="hero-map" />
      <div class="hero-overlay">
        <p v-if="itinerary.destination" class="hero-destination">{{ itinerary.destination }}</p>
        <h1 class="hero-title">{{ itinerary.sessionTitle }}</h1>
        <div class="hero-pills">
          <span v-if="formatHeaderRange(itinerary.startDate, itinerary.endDate)" class="hero-pill">
            📅 {{ formatHeaderRange(itinerary.startDate, itinerary.endDate) }}
          </span>
          <span v-if="itinerary.numberOfPax" class="hero-pill">
            👥 {{ itinerary.numberOfPax }} {{ itinerary.numberOfPax === 1 ? t('travel.viewer.traveller') : t('travel.viewer.travellers') }}
          </span>
          <span v-if="itinerary.viewCount !== undefined" class="hero-pill">
            👁 {{ itinerary.viewCount }} {{ itinerary.viewCount === 1 ? t('travel.viewer.view') : t('travel.viewer.views') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div v-if="itinerary && (!challengeRequired || challengeVerified)" class="viewer-wrap">

      <!-- Export actions -->
      <div class="trip-header-actions">
        <el-dropdown trigger="click" @command="(cmd: string) => cmd === 'json' ? exportJSON() : cmd === 'csv' ? exportCSV() : exportICS()">
          <el-button size="small">{{ t('travel.viewer.exportBtn') }}</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">{{ t('travel.viewer.exportJson') }}</el-dropdown-item>
              <el-dropdown-item command="csv">{{ t('travel.viewer.exportCsv') }}</el-dropdown-item>
              <el-dropdown-item command="ics">{{ t('travel.viewer.exportIcs') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- Empty agenda -->
      <EmptyState v-if="groupedByDate.length === 0" icon="🗺️" :title="t('travel.viewer.noItems')" />

      <!-- Timeline controls -->
      <div v-if="groupedByDate.length > 0" class="timeline-controls">
        <button class="timeline-toggle-all" @click="toggleAllDays">
          {{ allCollapsed ? t('travel.viewer.expandAll') : t('travel.viewer.collapseAll') }}
        </button>
      </div>

      <!-- Timeline -->
      <div v-if="groupedByDate.length > 0" class="timeline">
        <div v-for="(group, gi) in groupedByDate" :key="group.date" class="timeline-day">

          <!-- Day heading -->
          <div class="day-heading" @click="toggleDay(group.date)">
            <div v-if="group.dayNumber !== null" class="day-badge">{{ group.dayNumber }}</div>
            <div class="day-label">{{ formatDate(group.date) }}</div>
            <span class="day-item-count" v-if="collapsedDays.has(group.date)">{{ group.items.length }} {{ group.items.length === 1 ? t('travel.viewer.item') : t('travel.viewer.items') }}</span>
            <span class="day-chevron">{{ collapsedDays.has(group.date) ? '›' : '⌄' }}</span>
          </div>

          <!-- Items -->
          <div v-show="!collapsedDays.has(group.date)" class="day-items">
            <div v-for="(item, ii) in group.items" :key="item.id ?? ii" class="timeline-item">
              <!-- Spine: category emoji + connecting line -->
              <div class="item-spine">
                <div class="item-emoji">{{ getCategoryEmoji(item.category) }}</div>
                <div v-if="ii < group.items.length - 1 || gi < groupedByDate.length - 1" class="item-line" />
              </div>

              <!-- Content -->
              <div class="item-content">
                <div class="item-meta-row">
                  <span v-if="getTime(item)" class="item-time">{{ getTime(item) }}</span>
                  <span v-if="getCity(item)" class="item-city">{{ getCity(item) }}</span>
                  <span v-if="item.category" class="item-category-tag">{{ t(`travel.category.${item.category}`) }}</span>
                </div>
                <div class="item-title">{{ item.title || t('travel.viewer.untitled') }}</div>
                <div v-if="item.desc" class="item-desc">{{ item.desc }}</div>
                <div v-if="item.budget" class="item-budget">
                  <span class="budget-pill">💰 {{ item.budget.toLocaleString() }}</span>
                </div>
                <div v-if="item.files?.length" class="item-images">
                  <el-image v-for="(file, fi) in item.files" :key="fi" :src="fileBlobs.get(file.uuid)"
                    :preview-src-list="item.files.map((f: any) => fileBlobs.get(f.uuid)).filter(Boolean)"
                    :initial-index="fi" fit="cover" class="item-image-thumb" preview-teleported />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ── Bookings Section ─────────────────────────────────────────── -->
      <div v-if="viewerBookings.length > 0" class="bookings-section">
        <div class="bookings-header" @click="bookingsCollapsed = !bookingsCollapsed">
          <div class="bookings-header-left">
            <span class="bookings-title">{{ t('travel.viewer.bookings') }}</span>
            <div class="bookings-pills">
              <span class="booking-pill">SGD {{ viewerBookingTotal.toFixed(2) }}</span>
              <span class="booking-pill">{{ viewerBookedCount }} / {{ viewerBookings.length }} {{ t('travel.viewer.booked') }}</span>
            </div>
          </div>
          <div class="bookings-header-right">
            <span class="pax-names-label">{{ viewerPaxNames.join(' · ') }}</span>
            <el-icon class="collapse-icon" :class="{ 'is-collapsed': bookingsCollapsed }">
              <arrow-down />
            </el-icon>
          </div>
        </div>

        <div v-show="!bookingsCollapsed">
          <!-- Mobile: card list -->
          <div v-if="isMobile" class="booking-cards">
            <div v-for="booking in viewerBookings" :key="booking.id" class="booking-card">
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
                <span v-if="booking.freeCancellation">🔄 {{ booking.freeCancellation }}</span>
              </div>
            </div>
          </div>

          <!-- Desktop: table -->
          <el-table v-else :data="viewerBookings" class="booking-table" size="small">
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
                  <el-tooltip v-if="parsePayment(row.payment)!.date" :content="parsePayment(row.payment)!.date"
                    placement="top">
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
            <el-table-column v-for="name in viewerPaxNames" :key="name" :label="name" width="80">
              <template #default="{ row }">
                <span v-if="row.paxBreakdown?.[name] != null">{{ row.paxBreakdown[name].toFixed(0) }}</span>
                <span v-else class="dim">—</span>
              </template>
            </el-table-column>
            <el-table-column :label="t('travel.viewer.tableTotal')" width="90">
              <template #default="{ row }">
                <span v-if="row.price != null">{{ row.price.toFixed(2) }}</span>
                <span v-else class="dim">—</span>
              </template>
            </el-table-column>
            <el-table-column :label="t('travel.viewer.tableDates')" width="150">
              <template #default="{ row }">
                <span v-if="row.startDate || row.endDate">
                  {{ row.startDate ?? '' }}<template v-if="row.startDate && row.endDate"> → </template>{{ row.endDate
                    ?? '' }}
                  <template v-if="row.nights"> ({{ row.nights }}{{ t('travel.viewer.nights') }})</template>
                </span>
                <span v-else class="dim">—</span>
              </template>
            </el-table-column>
            <el-table-column :label="t('travel.viewer.tableBooked')" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.booked ? 'success' : 'info'" size="small" effect="light">
                  {{ row.booked ? '✓' : '✗' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('travel.viewer.tableCancellation')" min-width="130">
              <template #default="{ row }">
                <span v-if="row.freeCancellation">{{ row.freeCancellation }}</span>
                <span v-else class="dim">—</span>
              </template>
            </el-table-column>
            <el-table-column v-if="hasAccommodation" :label="t('travel.viewer.tableBfast')" width="60" align="center">
              <template #default="{ row }">
                <span v-if="row.category === 'accommodation'">{{ row.breakfast ? '✓' : '✗' }}</span>
                <span v-else class="dim">—</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

    </div>
  </div>

  <!-- CTA bar for non-users -->
  <Teleport to="body">
    <div v-if="!ctaDismissed && itinerary && (!challengeRequired || challengeVerified)" class="cta-bar">
      <span class="cta-text">✈️ Plan your own trip for free</span>
      <el-button type="primary" size="small" @click="nav.redirectTo('/travel')">Start planning →</el-button>
      <button class="cta-dismiss" @click="dismissCta">×</button>
    </div>
  </Teleport>

  <el-backtop target=".wrapper" :visibility-height="300" :right="24" :bottom="32" />
</template>

<style scoped>
/* ── Hero map ── */
.viewer-hero {
  position: relative;
  width: 100%;
  /* 16:9 proportional, floored at 320px on phones, capped at 460px on wide desktop */
  height: clamp(320px, 56.25vw, 460px);
}

.hero-map {
  height: 100%;
}

/* Override TravelMapView's internal min-heights so the hero container controls the size */
.hero-map :deep(.travel-map-wrapper) {
  min-height: unset;
  height: 100%;
}

.hero-map :deep(.map-area) {
  min-height: unset;
}

.hero-map :deep(.travel-map) {
  min-height: unset;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(to top, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.12) 50%, transparent 75%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 28px 24px;
}

.hero-destination {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.7);
  margin-bottom: 4px;
}

.hero-title {
  font-size: 1.9rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
  margin-bottom: 10px;
  text-shadow: 0 1px 6px rgba(0,0,0,0.35);
}

.hero-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hero-pill {
  font-size: 0.75rem;
  color: #fff;
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.28);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-radius: 20px;
  padding: 3px 10px;
}

/* ── CTA bar ── */
.cta-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(12,12,12,0.94);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255,255,255,0.08);
}

.cta-text {
  color: #fff;
  font-size: 0.88rem;
  flex: 1;
  min-width: 0;
}

.cta-dismiss {
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  flex-shrink: 0;
}

.cta-dismiss:hover { color: #fff; }

/* ── Timeline controls ── */
.timeline-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.timeline-toggle-all {
  font-size: 0.78rem;
  color: var(--el-text-color-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.12s;
}

.timeline-toggle-all:hover {
  color: #E8795A;
}

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
  padding-bottom: 72px;
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

.trip-header-actions {
  padding: 16px 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
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

.item-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.item-image-thumb {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  cursor: zoom-in;
  flex-shrink: 0;
}

.item-image-thumb :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  .hero-title { font-size: 1.35rem; }
  .hero-overlay { padding: 18px 16px; }
  .viewer-wrap { padding: 0; }
  .cta-text { font-size: 0.8rem; }
  .cta-bar { padding: 12px 16px; }
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

.pax-names-label {
  font-size: 12px;
  color: var(--color-text);
  opacity: 0.7;
}

.collapse-icon {
  transition: transform 0.2s;
  color: var(--color-text);
  opacity: 0.5;
}

.collapse-icon.is-collapsed {
  transform: rotate(-90deg);
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
</style>
