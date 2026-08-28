<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Location, Refresh } from '@element-plus/icons-vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import type { BusstopInformation } from '@/interfaces/BusstopInformation.model'
import type { BusArrivalService } from '@/interfaces/BusArrivalTiming.model'

const { t, te } = useI18n()

const RADII = [300, 500, 1000, 2000]
const MAX_STOPS_SHOWN = 5

// ── location ─────────────────────────────────────────────────────────────
const locating = ref(false)
const locationErrorMsg = ref('')
const coords = ref<{ lat: number; lng: number } | null>(null)

// ── nearby stops ─────────────────────────────────────────────────────────
const busstops = ref<BusstopInformation[]>([])
const busstopsLoading = ref(false)
const busstopsErrorMsg = ref('')

// ── arrivals (per-stop, lazily loaded on accordion expand) ─────────────────
interface StopArrivalsState {
  services: BusArrivalService[]
  loading: boolean
  errorMsg: string
  lastUpdated: Date | null
  loaded: boolean
}

const arrivalsByStop = ref<Record<string, StopArrivalsState>>({})
const activeStop = ref('')

function stopState(code: string): StopArrivalsState {
  return (
    arrivalsByStop.value[code] ??
    (arrivalsByStop.value[code] = {
      services: [],
      loading: false,
      errorMsg: '',
      lastUpdated: null,
      loaded: false,
    })
  )
}

function sortServices(services: BusArrivalService[]): BusArrivalService[] {
  return [...services].sort((a, b) =>
    a.ServiceNo.localeCompare(b.ServiceNo, undefined, { numeric: true })
  )
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

async function fetchArrivalsForStop(code: string, force = false) {
  if (!code) return
  const state = stopState(code)
  if (state.loaded && !force) return
  state.loading = true
  state.errorMsg = ''
  try {
    const res = await HttpClient.get(ApiRoute.LTA.GET_BUS_ARRIVAL_TIMING, {
      params: { busStopCode: code },
    })
    state.services = (res.data.data.records as BusArrivalService[]) ?? []
    state.lastUpdated = new Date()
    state.loaded = true
  } catch {
    state.errorMsg = t('bus.errors.arrivalsFetchFailed')
  } finally {
    state.loading = false
  }
}

watch(activeStop, (code) => {
  if (code) fetchArrivalsForStop(code)
})

async function fetchNearestBusstops() {
  if (!coords.value) return
  busstopsLoading.value = true
  busstopsErrorMsg.value = ''
  busstops.value = []
  arrivalsByStop.value = {}
  activeStop.value = ''
  try {
    let rows: BusstopInformation[] = []
    for (const radius of RADII) {
      const res = await HttpClient.post(ApiRoute.PPHS.GET_NEAREST_BUSSTOPS, {
        lat: String(coords.value.lat),
        lng: String(coords.value.lng),
        radius,
      })
      rows = (res.data.data as { rows: BusstopInformation[] }).rows ?? []
      if (rows.length) break
    }

    if (!rows.length) {
      busstopsErrorMsg.value = t('bus.errors.noStopsFound')
      return
    }

    busstops.value = rows.slice(0, MAX_STOPS_SHOWN)
    busstops.value.forEach((stop) => stopState(stop.busstop_code))
    activeStop.value = busstops.value[0].busstop_code
  } catch {
    busstopsErrorMsg.value = t('bus.errors.busstopFetchFailed')
  } finally {
    busstopsLoading.value = false
  }
}

function requestLocation() {
  if (!navigator.geolocation) {
    locationErrorMsg.value = t('bus.errors.unsupported')
    return
  }

  locating.value = true
  locationErrorMsg.value = ''
  busstopsErrorMsg.value = ''

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      coords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      locating.value = false
      fetchNearestBusstops()
    },
    (err) => {
      locating.value = false
      locationErrorMsg.value = err.code === err.PERMISSION_DENIED
        ? t('bus.errors.permissionDenied')
        : t('bus.errors.locationFailed')
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  )
}

function minutesUntil(iso: string): number | null {
  if (!iso) return null
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000))
}

function formatEta(iso: string): string {
  const mins = minutesUntil(iso)
  if (mins === null) return '—'
  return mins === 0 ? t('bus.arriving') : t('bus.minutesShort', { n: mins })
}

function loadLabel(load: string): string {
  const key = `bus.load.${load}`
  return te(key) ? t(key) : load
}

function loadTagType(load: string): '' | 'success' | 'warning' | 'danger' {
  if (load === 'SEA') return 'success'
  if (load === 'SDA') return 'warning'
  if (load === 'LSD') return 'danger'
  return ''
}

function formatUpdatedTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const canRefresh = computed(() => {
  if (!activeStop.value || busstopsLoading.value) return false
  return !stopState(activeStop.value).loading
})

const activeStopLoading = computed(() =>
  activeStop.value ? stopState(activeStop.value).loading : false
)

function refreshActiveStop() {
  if (activeStop.value) fetchArrivalsForStop(activeStop.value, true)
}

onMounted(requestLocation)
</script>

<template>
  <div class="bus-root">
    <div class="bus-heading">
      <p class="bus-eyebrow">{{ t('bus.eyebrow') }}</p>
      <h1 class="bus-title">{{ t('bus.title') }}</h1>
      <p class="bus-subtitle">{{ t('bus.subtitle') }}</p>
    </div>

    <!-- Locating -->
    <div v-if="locating" class="section-card status-card">
      <el-icon class="status-icon is-loading"><Location /></el-icon>
      <span>{{ t('bus.locating') }}</span>
    </div>

    <!-- Location error -->
    <div v-else-if="locationErrorMsg" class="section-card status-card status-card--error">
      <span>{{ locationErrorMsg }}</span>
      <el-button size="small" type="primary" @click="requestLocation">{{ t('bus.retry') }}</el-button>
    </div>

    <template v-else>
      <!-- Busstops loading -->
      <div v-if="busstopsLoading && !busstops.length" class="section-card status-card" v-loading="true" />

      <!-- Busstops error -->
      <div v-else-if="busstopsErrorMsg" class="section-card status-card status-card--error">
        <span>{{ busstopsErrorMsg }}</span>
        <el-button size="small" type="primary" @click="fetchNearestBusstops">{{ t('bus.retry') }}</el-button>
      </div>

      <template v-else-if="busstops.length">
        <div class="section-card">
          <div class="stops-header">
            <span class="section-label">{{ t('bus.nearbyStops') }}</span>
            <el-button
              circle size="small" :icon="Location" :loading="locating"
              :title="t('bus.locateButton')" @click="requestLocation"
            />
          </div>

          <div class="load-legend">
            <span class="legend-item"><span class="load-dot load-dot--success" />{{ t('bus.load.SEA') }}</span>
            <span class="legend-item"><span class="load-dot load-dot--warning" />{{ t('bus.load.SDA') }}</span>
            <span class="legend-item"><span class="load-dot load-dot--danger" />{{ t('bus.load.LSD') }}</span>
            <span class="legend-item">
              <svg class="wab-icon" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="38" cy="68" r="28" fill="none" stroke="currentColor" stroke-width="13" />
                <line x1="33" y1="20" x2="33" y2="55" stroke="currentColor" stroke-width="12" stroke-linecap="round" />
                <line x1="33" y1="32" x2="60" y2="32" stroke="currentColor" stroke-width="12" stroke-linecap="round" />
                <line x1="33" y1="55" x2="88" y2="75" stroke="currentColor" stroke-width="12" stroke-linecap="round" />
                <line x1="88" y1="75" x2="97" y2="88" stroke="currentColor" stroke-width="10" stroke-linecap="round" />
                <line x1="97" y1="88" x2="83" y2="93" stroke="currentColor" stroke-width="8" stroke-linecap="round" />
                <circle cx="33" cy="11" r="9" fill="currentColor" stroke="none" />
              </svg>
              {{ t('bus.wheelchairAccessible') }}
            </span>
            <span class="legend-item"><span class="type-badge">DD</span>{{ t('bus.busType.DD') }}</span>
            <span class="legend-item"><span class="type-badge">BD</span>{{ t('bus.busType.BD') }}</span>
          </div>

          <el-collapse v-model="activeStop" accordion class="stops-accordion">
            <el-collapse-item v-for="(stop, idx) in busstops" :key="stop.busstop_code" :name="stop.busstop_code">
              <template #title>
                <div class="stop-accordion-title">
                  <span class="stop-road">
                    {{ stop.road_name }}
                    <span v-if="idx === 0" class="nearest-badge">{{ t('bus.nearestBadge') }}</span>
                  </span>
                  <span class="stop-meta-line">
                    <span class="stop-code">{{ stop.busstop_code }}</span>
                    <span class="stop-distance">{{ formatDistance(Number(stop.distance_m)) }}</span>
                    <span v-if="stop.desc" class="stop-desc">{{ stop.desc }}</span>
                  </span>
                </div>
              </template>

              <div class="accordion-arrivals">
                <div
                  v-if="stopState(stop.busstop_code).loading && !stopState(stop.busstop_code).loaded"
                  v-loading="true" class="arrivals-loading"
                />

                <div v-else-if="stopState(stop.busstop_code).errorMsg" class="status-card status-card--error status-card--inline">
                  <span>{{ stopState(stop.busstop_code).errorMsg }}</span>
                  <el-button size="small" type="primary" @click="fetchArrivalsForStop(stop.busstop_code, true)">
                    {{ t('bus.retry') }}
                  </el-button>
                </div>

                <template v-else-if="stopState(stop.busstop_code).loaded">
                  <div v-if="!sortServices(stopState(stop.busstop_code).services).length" class="no-services">
                    {{ t('bus.noServices') }}
                  </div>

                  <template v-else>
                    <div v-if="stopState(stop.busstop_code).lastUpdated" class="updated-text updated-text--accordion">
                      {{ t('bus.updated', { time: formatUpdatedTime(stopState(stop.busstop_code).lastUpdated!) }) }}
                    </div>

                    <div class="services-list">
                      <div v-for="svc in sortServices(stopState(stop.busstop_code).services)" :key="svc.ServiceNo" class="service-row">
                        <div class="service-no">{{ svc.ServiceNo }}</div>
                        <div class="service-etas">
                          <div
                            v-for="(bus, busIdx) in [svc.NextBus, svc.NextBus2, svc.NextBus3]" :key="busIdx"
                            class="eta-chip"
                            :class="{ 'eta-chip--empty': !bus.EstimatedArrival }"
                          >
                            <span class="eta-time">{{ formatEta(bus.EstimatedArrival) }}</span>
                            <span class="eta-indicators">
                              <svg
                                v-if="bus.Feature === 'WAB'" class="wab-icon" viewBox="0 0 100 100"
                                :aria-label="t('bus.wheelchairAccessible')" role="img"
                              >
                                <title>{{ t('bus.wheelchairAccessible') }}</title>
                                <circle cx="38" cy="68" r="28" fill="none" stroke="currentColor" stroke-width="13" />
                                <line x1="33" y1="20" x2="33" y2="55" stroke="currentColor" stroke-width="12" stroke-linecap="round" />
                                <line x1="33" y1="32" x2="60" y2="32" stroke="currentColor" stroke-width="12" stroke-linecap="round" />
                                <line x1="33" y1="55" x2="88" y2="75" stroke="currentColor" stroke-width="12" stroke-linecap="round" />
                                <line x1="88" y1="75" x2="97" y2="88" stroke="currentColor" stroke-width="10" stroke-linecap="round" />
                                <line x1="97" y1="88" x2="83" y2="93" stroke="currentColor" stroke-width="8" stroke-linecap="round" />
                                <circle cx="33" cy="11" r="9" fill="currentColor" stroke="none" />
                              </svg>
                              <span
                                v-if="bus.Type === 'DD' || bus.Type === 'BD'" class="type-badge"
                                :title="t(`bus.busType.${bus.Type}`)" :aria-label="t(`bus.busType.${bus.Type}`)"
                              >{{ bus.Type }}</span>
                              <span
                                v-if="bus.Load" class="load-dot"
                                :class="`load-dot--${loadTagType(bus.Load) || 'default'}`"
                                :title="loadLabel(bus.Load)" :aria-label="loadLabel(bus.Load)"
                              />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </template>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </template>
    </template>
  </div>

  <!-- Floating refresh button -->
  <Teleport to="body">
    <button
      v-if="canRefresh"
      type="button"
      class="refresh-fab"
      :class="{ 'refresh-fab--loading': activeStopLoading }"
      :aria-label="t('bus.refreshNow')"
      :title="t('bus.refreshNow')"
      @click="refreshActiveStop"
    >
      <el-icon :size="22"><Refresh /></el-icon>
    </button>
  </Teleport>
</template>

<style scoped>
.bus-root {
  max-width: min(640px, 98vw);
  width: 100%;
  justify-self: center;
  padding-bottom: 96px;
  overflow-x: hidden;
}

.bus-heading {
  padding: 24px 0 20px;
}

.bus-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}

.bus-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.bus-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0;
}

.section-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
  min-height: 60px;
}

.status-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text);
  flex-direction: column;
}

.status-card--error {
  color: var(--el-color-danger);
}

.status-card--inline {
  min-height: unset;
  padding: 12px 0;
  margin-bottom: 0;
}

.status-icon {
  font-size: 1.4rem;
  color: var(--el-color-primary);
}

.section-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
}

.stops-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.load-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 14px 0 4px;
  padding: 10px 12px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.75;
  white-space: nowrap;
}

.stops-accordion {
  margin-top: 12px;
  border: none;
  --el-collapse-border-color: var(--color-border);
}

.stops-accordion :deep(.el-collapse-item__header) {
  background: transparent;
  height: auto;
  min-height: 40px;
  padding: 8px 0;
  line-height: 1.3;
  border-bottom-color: var(--color-border);
}

.stops-accordion :deep(.el-collapse-item__arrow) {
  margin: 0 0 0 8px;
}

.stops-accordion :deep(.el-collapse-item__wrap) {
  background: transparent;
  border-bottom-color: var(--color-border);
}

.stops-accordion :deep(.el-collapse-item__content) {
  padding: 4px 0 14px;
}

.stop-accordion-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding-right: 8px;
  min-width: 0;
  text-align: left;
}

.stop-road {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--color-heading);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.nearest-badge {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  border-radius: 4px;
  padding: 1px 6px;
}

.stop-meta-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.stop-code {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--el-color-primary);
}

.stop-distance {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.55;
}

.stop-desc {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.55;
}

.updated-text {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.45;
}

.updated-text--accordion {
  margin-bottom: 10px;
}

.arrivals-loading {
  min-height: 60px;
}

.no-services {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.55;
  font-style: italic;
  padding: 8px 0;
}

.services-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.service-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  min-width: 0;
}

.service-no {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  min-width: 44px;
  flex-shrink: 0;
}

.service-etas {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.eta-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 56px;
}

.eta-chip--empty {
  opacity: 0.35;
}

.eta-time {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.eta-indicators {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.wab-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--el-color-primary);
}

.type-badge {
  font-size: 0.56rem;
  font-weight: 700;
  line-height: 1;
  color: var(--color-text);
  opacity: 0.7;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  padding: 1px 3px;
}

.load-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--color-text);
  opacity: 0.4;
}

.load-dot--success {
  background: var(--el-color-success);
  opacity: 1;
}

.load-dot--warning {
  background: var(--el-color-warning);
  opacity: 1;
}

.load-dot--danger {
  background: var(--el-color-danger);
  opacity: 1;
}

.refresh-fab {
  position: fixed;
  right: max(20px, env(safe-area-inset-right, 20px));
  bottom: max(24px, env(safe-area-inset-bottom, 24px));
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-color-primary);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--el-color-primary) 40%, transparent);
  z-index: 100;
  transition: transform 0.15s, box-shadow 0.15s;
}

.refresh-fab:active {
  transform: scale(0.92);
}

.refresh-fab--loading {
  animation: refresh-fab-spin 0.8s linear infinite;
  pointer-events: none;
}

@keyframes refresh-fab-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 800px) {
  .service-etas {
    justify-content: flex-start;
  }
}
</style>
