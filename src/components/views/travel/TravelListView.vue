<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { ref, computed, onMounted, watch } from 'vue'
import { useNav } from '@/hooks/useNav'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { GeneratorUtils } from '@/utilities/GeneratorUtils'
import { ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { EditPen, ArrowRight, View, Link, Delete, Plus, Calendar, User } from '@element-plus/icons-vue'
import { CATEGORY_ICON_SVG } from '@/constants/TravelIconSvg'
import TravelIcon from '@/components/icons/TravelIcon.vue'
import PageBackButton from '@/components/common/PageBackButton.vue'
import CreateTripDialog, { type CreateTripPayload } from '@/components/views/travel/CreateTripDialog.vue'

const nav = useNav()
const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore)

const { t } = useI18n()
const toast = useToast()

interface TripCard {
  id: number
  sessionId: string
  sessionTitle: string
  destination?: string
  startDate?: number
  endDate?: number
  numberOfPax?: number
  durationInDays?: number
  shortCode?: string
}

const myTrips = ref<TripCard[]>([])
const sharedTrips = ref<TripCard[]>([])
const loading = ref(false)
const creating = ref(false)

const fetchTrips = async () => {
  loading.value = true
  const res = await HttpClient.get(ApiRoute.ITINERARY.GET_ALL).catch(() => null)
  if (res?.data?.data) {
    myTrips.value = res.data.data.myTrips ?? []
    sharedTrips.value = res.data.data.sharedTrips ?? []
  }
  loading.value = false
}

onMounted(() => {
  if (!isAuthenticated.value) {
    layoutStore.loginDialog.setTrue()
    return
  }
  fetchTrips()
})

watch(isAuthenticated, (val) => {
  if (val) fetchTrips()
})

// ── Grouping: happening now / upcoming (incl. undated) / past ───────────────
const DAY_MS = 86_400_000
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }
const dayStart = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime() }

type TripStatus = 'ongoing' | 'upcoming' | 'past' | 'undated'
const statusOf = (trip: TripCard): TripStatus => {
  if (!trip.startDate) return 'undated'
  const today = startOfToday()
  const start = dayStart(trip.startDate)
  const end = trip.endDate ? dayStart(trip.endDate) : start
  if (end < today) return 'past'
  if (start <= today) return 'ongoing'
  return 'upcoming'
}

const byStart = (a: TripCard, b: TripCard) => (a.startDate ?? Infinity) - (b.startDate ?? Infinity)
const ongoingTrips = computed(() => myTrips.value.filter((x) => statusOf(x) === 'ongoing').sort(byStart))
const upcomingTrips = computed(() =>
  myTrips.value.filter((x) => statusOf(x) === 'upcoming' || statusOf(x) === 'undated').sort(byStart),
)
const pastTrips = computed(() =>
  myTrips.value.filter((x) => statusOf(x) === 'past').sort((a, b) => (b.startDate ?? 0) - (a.startDate ?? 0)),
)

// Countdown copy for the card badge
const countdown = (trip: TripCard): string | null => {
  const status = statusOf(trip)
  if (status === 'ongoing') return t('travel.list.ongoingBadge')
  if (status === 'past') return t('travel.list.endedBadge')
  if (status === 'undated') return null
  const days = Math.round((dayStart(trip.startDate!) - startOfToday()) / DAY_MS)
  if (days === 0) return t('travel.list.startsToday')
  if (days === 1) return t('travel.list.startsTomorrow')
  return t('travel.list.startsIn', { n: days })
}

const tripDays = (trip: TripCard): number | null => {
  if (trip.durationInDays && trip.durationInDays > 0) return trip.durationInDays
  if (trip.startDate && trip.endDate) return Math.round((dayStart(trip.endDate) - dayStart(trip.startDate)) / DAY_MS) + 1
  return null
}

const formatDateRange = (startDate?: number, endDate?: number) => {
  if (!startDate) return t('travel.list.datesTbc')
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return endDate ? `${fmt(startDate)} – ${fmt(endDate)}` : fmt(startDate)
}

// Deterministic warm tint per trip so cards don't all look identical.
const TINTS = ['#C84B31', '#D9A441', '#3F7D6B', '#4C6FB1', '#8E5FA8', '#B8683B']
const tintOf = (trip: TripCard) => {
  const s = trip.destination || trip.sessionTitle || trip.sessionId
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}

const initialOf = (trip: TripCard) => (trip.destination || trip.sessionTitle || '?').trim().charAt(0).toUpperCase()

// ── Create ───────────────────────────────────────────────────────────────────
const showCreateTripDialog = ref(false)

const handleCreate = () => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  showCreateTripDialog.value = true
}

const onTripCreated = async (payload: CreateTripPayload) => {
  creating.value = true
  const res = await HttpClient.post(ApiRoute.ITINERARY.CREATE, {
    idempotencyKey: GeneratorUtils.generateUUID(),
    sessionTitle: payload.sessionTitle || t('travel.list.untitledTrip'),
    destination: payload.destination,
    destinationRaw: payload.destinationRaw,
    country: payload.country,
    numberOfPax: 1,
    durationInDays: payload.durationInDays,
    unknownDate: payload.unknownDate,
    itineraryDateRaw: payload.itineraryDateRaw,
    startDate: payload.startDate,
    endDate: payload.endDate,
    agendaItems: [],
    _agendaIdsToDelete: [],
    _agendaIdsToUpdate: [],
  }).catch(() => null)
  creating.value = false
  if (!res?.data?.data?.sessionId) { toast.error(t('travel.list.failed')); return }
  nav.redirectTo(`/travel/${res.data.data.sessionId}`)
}

// ── Card actions ─────────────────────────────────────────────────────────────
const copyShareLink = async (shortCode: string) => {
  const url = `${window.location.origin}/travel/v/${shortCode}`
  try {
    await navigator.clipboard.writeText(url)
    toast.success(t('travel.list.linkCopied'))
  } catch {
    toast.error(t('travel.share.copyFailed'))
  }
}

const confirmDelete = (trip: TripCard) => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  ElMessageBox.confirm(t('travel.list.deleteConfirm', { title: trip.sessionTitle }), t('travel.list.deleteTitle'), {
    confirmButtonText: t('travel.list.delete'),
    cancelButtonText: t('travel.list.cancel'),
    type: 'warning',
    confirmButtonClass: 'el-button--danger',
  }).then(() => deleteTrip(trip.sessionId)).catch(() => {})
}

const deleteTrip = async (sessionId: string) => {
  const res = await HttpClient.post(ApiRoute.ITINERARY.DELETE(sessionId), {}).catch(() => null)
  if (!res?.data?.data?.deleted) {
    toast.error(t('travel.list.failedDelete'))
    return
  }
  myTrips.value = myTrips.value.filter((x) => x.sessionId !== sessionId)
  toast.success(t('travel.list.deleted'))
}
</script>

<template>
  <div class="page-container">

    <!-- Auth gate -->
    <div v-if="!isAuthenticated" class="auth-gate">
      <p class="auth-gate-eyebrow"><TravelIcon :svg="CATEGORY_ICON_SVG.flight" /> {{ t('travel.list.eyebrow') }}</p>
      <h2 class="auth-gate-heading">{{ t('travel.list.heroHeading') }}</h2>
      <p class="auth-gate-text">{{ t('travel.list.loginPrompt') }}</p>
      <div class="auth-gate-actions">
        <el-button type="primary" size="large" round @click="layoutStore.loginDialog.setTrue()">{{ t('travel.list.login') }}</el-button>
        <div class="guest-draft-card" role="button" tabindex="0" @click="nav.redirectTo('/travel/draft')" @keyup.enter="nav.redirectTo('/travel/draft')">
          <div class="guest-draft-icon-wrap"><el-icon><EditPen /></el-icon></div>
          <div>
            <div class="guest-draft-title">{{ t('travel.list.startDraft') }}</div>
            <div class="guest-draft-sub">{{ t('travel.list.startDraftSub') }}</div>
          </div>
          <el-icon class="guest-draft-arrow"><ArrowRight /></el-icon>
        </div>
      </div>
    </div>

    <template v-else>
    <header class="list-header">
      <div class="page-heading">
        <PageBackButton />
        <div>
          <p class="list-eyebrow"><TravelIcon :svg="CATEGORY_ICON_SVG.flight" /> {{ t('travel.list.eyebrow') }}</p>
          <h1 class="list-title">{{ t('travel.list.title') }}</h1>
          <p class="list-subtitle">{{ t('travel.list.subtitle') }}</p>
        </div>
      </div>
      <el-button type="primary" round :loading="creating" @click="handleCreate">
        <el-icon><Plus /></el-icon> {{ t('travel.list.newTripShort') }}
      </el-button>
    </header>

    <div v-if="loading" class="trip-grid">
      <div v-for="i in 3" :key="i" class="trip-card trip-card--skeleton"><el-skeleton :rows="3" animated /></div>
    </div>

    <!-- Empty -->
    <div v-else-if="myTrips.length === 0 && sharedTrips.length === 0" class="empty-hero">
      <div class="empty-art" aria-hidden="true"><TravelIcon :svg="CATEGORY_ICON_SVG.flight" /></div>
      <h2 class="empty-title">{{ t('travel.list.noTripsTitle') }}</h2>
      <p class="empty-sub">{{ t('travel.list.noTripsSub') }}</p>
      <el-button type="primary" size="large" round :loading="creating" @click="handleCreate">
        <el-icon><Plus /></el-icon> {{ t('travel.list.createFirst') }}
      </el-button>
    </div>

    <template v-else>
      <section v-for="section in [
        { key: 'ongoing', label: t('travel.list.ongoing'), trips: ongoingTrips },
        { key: 'upcoming', label: t('travel.list.upcoming'), trips: upcomingTrips },
        { key: 'past', label: t('travel.list.past'), trips: pastTrips },
      ]" v-show="section.trips.length" :key="section.key" class="trip-section" :class="`trip-section--${section.key}`">
        <h2 class="section-label">{{ section.label }} <span class="section-count">{{ section.trips.length }}</span></h2>

        <div class="trip-grid">
          <article
            v-for="trip in section.trips"
            :key="trip.sessionId"
            class="trip-card"
            :class="{ 'trip-card--past': section.key === 'past' }"
            :style="{ '--tint': tintOf(trip) }"
            role="link"
            tabindex="0"
            @click="nav.redirectTo(`/travel/${trip.sessionId}`)"
            @keyup.enter="nav.redirectTo(`/travel/${trip.sessionId}`)"
          >
            <div class="trip-cover">
              <span class="trip-initial">{{ initialOf(trip) }}</span>
              <span v-if="countdown(trip)" class="trip-countdown">{{ countdown(trip) }}</span>
            </div>
            <div class="trip-card-body">
              <div class="trip-destination">{{ trip.destination || t('travel.list.destinationTbc') }}</div>
              <div class="trip-title">{{ trip.sessionTitle }}</div>
              <div class="trip-meta">
                <span class="trip-meta-item"><el-icon><Calendar /></el-icon> {{ formatDateRange(trip.startDate, trip.endDate) }}</span>
                <span v-if="tripDays(trip)" class="trip-meta-item">{{ t('travel.list.daysChip', tripDays(trip)!) }}</span>
                <span v-if="trip.numberOfPax" class="trip-meta-item"><el-icon><User /></el-icon> {{ t('travel.list.pax', { n: trip.numberOfPax }) }}</span>
              </div>
            </div>
            <div class="trip-card-actions" @click.stop>
              <el-tooltip :content="t('travel.list.viewTrip')" placement="top">
                <el-button v-if="trip.shortCode" circle size="small" @click="nav.redirectTo(`/travel/v/${trip.shortCode}`)">
                  <el-icon style="font-size: 0.75rem"><View /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="t('travel.list.copyLink')" placement="top">
                <el-button v-if="trip.shortCode" circle size="small" @click="copyShareLink(trip.shortCode!)">
                  <el-icon style="font-size: 0.75rem"><Link /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="t('travel.list.deleteTrip')" placement="top">
                <el-button circle size="small" @click="confirmDelete(trip)">
                  <el-icon style="font-size: 0.75rem"><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </article>
        </div>
      </section>

      <!-- Shared with Me: only once the API actually returns shared trips
           (qindom's add-collaborator endpoint is still a stub). -->
      <section v-if="sharedTrips.length > 0" class="trip-section">
        <h2 class="section-label">{{ t('travel.list.sharedWithMe') }} <span class="section-count">{{ sharedTrips.length }}</span></h2>
        <div class="trip-grid">
          <article
            v-for="trip in sharedTrips"
            :key="trip.sessionId"
            class="trip-card trip-card--shared"
            :style="{ '--tint': tintOf(trip) }"
            role="link"
            tabindex="0"
            @click="nav.redirectTo(`/travel/${trip.sessionId}`)"
            @keyup.enter="nav.redirectTo(`/travel/${trip.sessionId}`)"
          >
            <div class="trip-cover"><span class="trip-initial">{{ initialOf(trip) }}</span></div>
            <div class="trip-card-body">
              <div class="trip-destination">{{ trip.destination || t('travel.list.destinationTbc') }}</div>
              <div class="trip-title">{{ trip.sessionTitle }}</div>
              <div class="trip-meta">
                <span class="trip-meta-item"><el-icon><Calendar /></el-icon> {{ formatDateRange(trip.startDate, trip.endDate) }}</span>
                <span v-if="trip.numberOfPax" class="trip-meta-item"><el-icon><User /></el-icon> {{ t('travel.list.pax', { n: trip.numberOfPax }) }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>

    </template>

    <CreateTripDialog v-model="showCreateTripDialog" @create="onTripCreated" />
  </div>
</template>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
  gap: 12px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.list-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}

.list-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-heading);
}

.list-subtitle {
  font-size: 0.83rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 4px;
}

.trip-section {
  margin-bottom: 36px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.55;
  margin-bottom: 12px;
}

.section-count {
  font-size: 0.68rem;
  padding: 1px 7px;
  border-radius: 9px;
  background: var(--color-background-mute);
  letter-spacing: 0;
}

.trip-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.trip-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius, 16px);
  background: var(--color-background-soft);
  cursor: pointer;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}

.trip-card:hover,
.trip-card:focus-visible {
  transform: translateY(-2px);
  box-shadow: var(--shadow-pop);
  border-color: color-mix(in srgb, var(--tint) 50%, var(--color-border));
  outline: none;
}

.trip-card--past { opacity: 0.78; }
.trip-card--past:hover { opacity: 1; }
.trip-card--shared { border-style: dashed; }
.trip-card--skeleton { padding: 16px; cursor: default; }

.trip-cover {
  position: relative;
  height: 74px;
  background:
    radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--tint) 55%, #fff) 0%, transparent 55%),
    linear-gradient(135deg, color-mix(in srgb, var(--tint) 85%, #000) 0%, var(--tint) 100%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 10px 14px;
}

.trip-initial {
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.trip-countdown {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--tint);
  white-space: nowrap;
}

.trip-card-body {
  flex: 1;
  min-width: 0;
  padding: 12px 14px 14px;
}

.trip-destination {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--tint);
  margin-bottom: 3px;
}

.trip-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}

.trip-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 0.76rem;
  color: var(--color-text);
  opacity: 0.65;
}

.trip-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.trip-card-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.trip-card:hover .trip-card-actions,
.trip-card:focus-within .trip-card-actions { opacity: 1; }

/* Empty */
.empty-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 56px 16px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius, 16px);
  background: var(--color-background-soft);
}

.empty-art {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  color: var(--el-color-primary);
  font-size: 1.8rem;
  margin-bottom: 6px;
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-heading);
}

.empty-sub {
  font-size: 0.86rem;
  color: var(--color-text);
  opacity: 0.6;
  max-width: 360px;
  margin-bottom: 8px;
}

/* Auth gate */
.auth-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 72px 16px;
}

.auth-gate-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 2px;
}

.auth-gate-heading {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.auth-gate-text {
  font-size: 0.88rem;
  color: var(--color-text);
  opacity: 0.55;
  margin-bottom: 8px;
}

.auth-gate-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 360px;
}

.guest-draft-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px dashed var(--color-border);
  border-radius: 14px;
  background: var(--color-background-soft);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  width: 100%;
  text-align: left;
}

.guest-draft-card:hover,
.guest-draft-card:focus-visible {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 4%, var(--color-background-soft));
  box-shadow: 0 4px 14px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  outline: none;
}

.guest-draft-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  font-size: 1.2rem;
  flex-shrink: 0;
}

.guest-draft-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
}

.guest-draft-sub {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.55;
  margin-top: 2px;
}

.guest-draft-arrow {
  margin-left: auto;
  color: var(--el-color-primary);
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.guest-draft-card:hover .guest-draft-arrow { opacity: 0.8; }

@media (max-width: 900px) {
  .trip-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 540px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
  }
  .trip-grid { grid-template-columns: 1fr; }
  /* Touch has no hover: keep the row actions visible */
  .trip-card-actions { opacity: 1; }
}
</style>
