<template>
  <div class="travel-map-wrapper">
    <!-- Filter bar (shown once items are resolved) -->
    <div class="map-filters">
      <div class="map-filters-top">
        <div v-if="sorted.length > 0" class="filter-sections">
          <div class="filter-section">
            <span class="filter-label">Type</span>
            <div class="filter-chips">
              <button
                v-for="cat in availableCategories"
                :key="cat"
                class="filter-chip"
                :class="{ excluded: excludedCategories.has(cat) }"
                @click="toggleCategory(cat)"
              >
                {{ TRAVEL_CATEGORY_EMOJI[cat] ?? '📍' }} {{ t(`travel.category.${cat}`) }}
              </button>
            </div>
          </div>
          <div v-if="availableDays.length > 1" class="filter-section filter-section--bordered">
            <span class="filter-label">Day</span>
            <div class="filter-chips">
              <button class="filter-chip" :class="{ active: selectedDays.length === 0 }" @click="selectedDays = []">
                All
              </button>
              <button
                v-for="day in availableDays"
                :key="day"
                class="filter-chip day-chip"
                :style="{ '--day-color': getDayColor(day) }"
                :class="{ active: selectedDays.includes(day) }"
                @click="toggleDay(day)"
              >
                Day {{ day }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="map-area">
      <div v-if="resolving" class="map-overlay-msg">Resolving locations…</div>
      <div v-else-if="sorted.length === 0" class="map-overlay-msg">
        No agenda items with location data yet.
      </div>
      <div v-else-if="filteredItems.length === 0" class="map-overlay-msg">
        No items match the current filters.
      </div>
      <div id="travel-map" class="travel-map"></div>
      <button class="expand-btn" @click="emit('toggle-fullscreen')" :title="fullscreen ? 'Exit fullscreen' : 'Fullscreen'">
        {{ fullscreen ? '⤡' : '⤢' }}
      </button>

      <!-- Top-right controls: Fit all + tile toggle stacked -->
      <div class="map-controls">
        <button v-if="filteredItems.length > 0" class="fit-btn" @click="fitAll">⊞ Fit all</button>
        <div class="tile-toggle">
          <button class="tile-btn" :class="{ active: tileMode === 'satellite' }" @click="setTileMode('satellite')">🛰 Sat</button>
          <button class="tile-btn" :class="{ active: tileMode === 'street' }" @click="setTileMode('street')">🗺 Map</button>
        </div>
      </div>

      <!-- Stepper navigation -->
      <div v-if="filteredItems.length > 0" class="map-stepper">
        <button class="stepper-btn" :disabled="activeStepIndex <= 0" @click="stepPrev">‹</button>
        <div class="stepper-info">
          <span class="stepper-count">{{ activeStepIndex + 1 }} / {{ filteredItems.length }}</span>
          <span
            class="stepper-day"
            :style="{ color: getDayColor(filteredItems[activeStepIndex]?._day ?? 1) }"
          >Day {{ filteredItems[activeStepIndex]?._day }}</span>
          <span class="stepper-title">{{ filteredItems[activeStepIndex]?.title }}</span>
        </div>
        <button class="stepper-btn" :disabled="activeStepIndex >= filteredItems.length - 1" @click="stepNext">›</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import type { Map as LeafletMap, FeatureGroup, TileLayer } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { searchPlaces } from '@/composables/useGeocode'
import type { AgendaItem } from '@/interfaces/forms/itinerary/AgendaItem'

const TRAVEL_CATEGORY_EMOJI: Record<string, string> = {
  flight: '✈️', hotel: '🏨', dining: '🍽️', attraction: '🎡',
  transport: '🚌', shopping: '🛍️', entertainment: '🎭', nature: '🌿', other: '📍',
}

const DAY_COLORS = ['#60A5FA', '#FBBF24', '#34D399', '#F87171', '#A78BFA', '#FB923C', '#22D3EE', '#F472B6']
const getDayColor = (day: number) => DAY_COLORS[(day - 1) % DAY_COLORS.length]

const { t } = useI18n()
const props = defineProps<{ agendaItems: AgendaItem[]; fullscreen?: boolean }>()
const emit = defineEmits<{ 'toggle-fullscreen': [] }>()

// Use plain variables for Leaflet instances to avoid Vue ref type incompatibility
let mapInstance: LeafletMap | null = null
let markerGroup: FeatureGroup | null = null
let routeLines: L.Polyline[] = []
let tipEl: HTMLDivElement | null = null
const resolving = ref(false)

// Stepper state
const activeStepIndex = ref(0)
let activeCoordKey: string | null = null
let markerRefs: Map<string, L.Marker> = new Map()
let normalIcons: Map<string, L.DivIcon> = new Map()
let activeIcons: Map<string, L.DivIcon> = new Map()

const coordKey = (c: { lat: number; lng: number }) => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`

// Tile layers
let satelliteBase: TileLayer | null = null
let satelliteLabels: TileLayer | null = null
let streetLayer: TileLayer | null = null
const tileMode = ref<'satellite' | 'street'>('satellite')

const setTileMode = (mode: 'satellite' | 'street') => {
  if (!mapInstance) return
  tileMode.value = mode
  if (mode === 'satellite') {
    streetLayer?.removeFrom(mapInstance)
    satelliteBase?.addTo(mapInstance)
    satelliteLabels?.addTo(mapInstance)
  } else {
    satelliteBase?.removeFrom(mapInstance)
    satelliteLabels?.removeFrom(mapInstance)
    streetLayer?.addTo(mapInstance)
  }
}

function showTip(text: string, anchor: HTMLElement) {
  if (!tipEl) {
    tipEl = document.createElement('div')
    tipEl.className = 'popup-loc-tooltip'
    document.body.appendChild(tipEl)
  }
  tipEl.textContent = text
  const rect = anchor.getBoundingClientRect()
  tipEl.style.left = `${rect.left}px`
  tipEl.style.top = `${rect.top - 6}px`
  tipEl.style.transform = 'translateY(-100%)'
  tipEl.style.display = 'block'
}

function hideTip() {
  if (tipEl) tipEl.style.display = 'none'
}

interface ResolvedItem extends AgendaItem {
  _coords: { lat: number; lng: number }
  _day: number
}

function toLocalDateKey(date: any): string {
  if (!date) return '__tbc__'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '__tbc__'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const sorted = ref<ResolvedItem[]>([])

// ── Filters ───────────────────────────────────────────────────────────────────
const excludedCategories = ref<Set<string>>(new Set(['flight']))
const selectedDays = ref<number[]>([])

const availableCategories = computed(() =>
  [...new Set(sorted.value.map((i) => i.category ?? 'other'))],
)

const availableDays = computed(() =>
  [...new Set(sorted.value.map((i) => i._day))].sort((a, b) => a - b),
)

const filteredItems = computed(() =>
  sorted.value.filter((item) => {
    const cat = item.category ?? 'other'
    if (excludedCategories.value.has(cat)) return false
    if (selectedDays.value.length > 0 && !selectedDays.value.includes(item._day)) return false
    return true
  }),
)

function toggleCategory(cat: string) {
  const next = new Set(excludedCategories.value)
  next.has(cat) ? next.delete(cat) : next.add(cat)
  excludedCategories.value = next
}

function toggleDay(day: number) {
  const idx = selectedDays.value.indexOf(day)
  selectedDays.value = idx === -1
    ? [...selectedDays.value, day]
    : selectedDays.value.filter((d) => d !== day)
}

// ── Sorting & geocoding ───────────────────────────────────────────────────────
function agendaSortKey(item: AgendaItem): string {
  const unknown = item.unknownTime ?? (item as any).unknown_time
  const st = item.startTime ?? (item as any).start_time
  return !unknown && st ? String(st) : '99:99'
}

function sortItems(items: AgendaItem[]): AgendaItem[] {
  return [...items].sort((a, b) => {
    const dayDiff = (a.day ?? 1) - (b.day ?? 1)
    if (dayDiff !== 0) return dayDiff
    return agendaSortKey(a).localeCompare(agendaSortKey(b))
  })
}

async function resolveCoordinates(items: AgendaItem[]): Promise<ResolvedItem[]> {
  const uniqueDates = [...new Set(items.map((i) => toLocalDateKey(i.date)))]
    .filter((k) => k !== '__tbc__')
    .sort()
  const dateKeyToDayNum = new Map(uniqueDates.map((k, i) => [k, i + 1]))

  const globalOrder = sortItems(items)

  const results: ResolvedItem[] = []
  let firstRequest = true

  for (const item of globalOrder) {
    let coords: { lat: number; lng: number } | null = null

    const cityRaw: string[] = item.cityRaw?.length
      ? item.cityRaw
      : (() => { try { return JSON.parse((item as any).city_raw ?? (item as any).city ?? '[]') } catch { return [] } })()

    if (item.coordinates) {
      coords = item.coordinates
    } else if (cityRaw.length) {
      if (!firstRequest) await new Promise((r) => setTimeout(r, 400))
      firstRequest = false
      const places = await searchPlaces(cityRaw[0].split(',')[0].trim())
      if (places[0]) coords = { lat: places[0].lat, lng: places[0].lng }
    }

    if (coords) {
      results.push({
        ...item,
        _coords: coords,
        _day: dateKeyToDayNum.get(toLocalDateKey(item.date)) ?? 1,
      })
    }
  }

  results.sort((a, b) => {
    const dayDiff = a._day - b._day
    if (dayDiff !== 0) return dayDiff
    return agendaSortKey(a).localeCompare(agendaSortKey(b))
  })

  return results
}

// ── Map rendering ─────────────────────────────────────────────────────────────
function renderMap(items: ResolvedItem[]) {
  if (!mapInstance) return

  if (markerGroup) { markerGroup.clearLayers(); markerGroup.removeFrom(mapInstance) }
  routeLines.forEach((l) => l.removeFrom(mapInstance!))
  routeLines = []
  markerRefs.clear(); normalIcons.clear(); activeIcons.clear(); activeCoordKey = null

  markerGroup = L.featureGroup()

  // Group items sharing the same coordinates into a single marker
  const groupMap = new Map<string, { items: ResolvedItem[]; seq: number[] }>()
  const groupOrder: string[] = []

  for (let i = 0; i < items.length; i++) {
    const key = coordKey(items[i]._coords)
    if (!groupMap.has(key)) {
      groupMap.set(key, { items: [], seq: [] })
      groupOrder.push(key)
    }
    groupMap.get(key)!.items.push(items[i])
    groupMap.get(key)!.seq.push(i + 1)
  }

  for (const key of groupOrder) {
    const { items: group, seq } = groupMap.get(key)!
    const first = group[0]
    const isStacked = group.length > 1
    const color = getDayColor(first._day)
    const emoji = isStacked ? '📍' : (TRAVEL_CATEGORY_EMOJI[first.category ?? ''] ?? '📍')
    const badgeHtml = isStacked
      ? `<span class="pin-badge">+${group.length - 1}</span>`
      : `<span class="pin-seq">${seq[0]}</span>`

    const makeIcon = (active: boolean) => L.divIcon({
      className: '',
      html: `<div class="travel-pin${active ? ' travel-pin--active' : ''}" style="background:${color}"><span class="pin-emoji">${emoji}</span>${badgeHtml}</div>`,
      iconSize: active ? [42, 42] : [36, 36],
      iconAnchor: active ? [21, 21] : [18, 18],
      popupAnchor: [0, -22],
    })

    normalIcons.set(key, makeIcon(false))
    activeIcons.set(key, makeIcon(true))

    const popupRows = group.map((item, idx) => {
      const pEmoji = TRAVEL_CATEGORY_EMOJI[item.category ?? ''] ?? '📍'
      const timeLabel = !item.unknownTime && item.startTime ? ` · ${item.startTime}` : ''
      const dateLabel = item.date
        ? `Day ${item._day} · ${new Date(`${item.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
        : `Day ${item._day}`
      const resolvedCityRaw: string[] = item.cityRaw?.length
        ? item.cityRaw
        : (() => { try { return JSON.parse((item as any).city ?? '[]') } catch { return [] } })()
      const locationLabel = item.placeDisplay || resolvedCityRaw[0] || ''
      const locationLine = locationLabel
        ? `<div class="popup-loc-tip" data-tip="${locationLabel}" style="font-size:0.75rem;color:#888;margin-top:1px;cursor:default"><span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">📍 ${locationLabel}</span></div>`
        : ''
      const sep = idx > 0 ? '<hr style="margin:5px 0;border:none;border-top:1px solid #eee">' : ''
      return `${sep}<div style="font-size:0.88rem;font-weight:600;color:#111"><span style="opacity:0.45;font-weight:400">#${seq[idx]}</span> ${pEmoji} ${item.title}</div><div style="font-size:0.78rem;color:#666;margin-top:2px">${dateLabel}${timeLabel}</div>${locationLine}`
    }).join('')

    const marker = L.marker([first._coords.lat, first._coords.lng], { icon: normalIcons.get(key)! })
    marker.bindPopup(`<div style="min-width:140px;max-width:220px;max-height:130px;overflow-y:auto">${popupRows}</div>`)
    // Sync stepper index when user clicks a pin
    marker.on('click', () => {
      const idx = filteredItems.value.findIndex((i) => coordKey(i._coords) === key)
      if (idx !== -1) { activeStepIndex.value = idx; highlightStep(idx) }
    })
    markerRefs.set(key, marker)
    marker.addTo(markerGroup!)
  }

  markerGroup.addTo(mapInstance)

  // Day-colored route lines
  if (items.length > 1) {
    const dayGroups = new Map<number, ResolvedItem[]>()
    for (const item of items) {
      if (!dayGroups.has(item._day)) dayGroups.set(item._day, [])
      dayGroups.get(item._day)!.push(item)
    }
    const dayKeys = [...dayGroups.keys()].sort((a, b) => a - b)

    for (const day of dayKeys) {
      const dayItems = dayGroups.get(day)!
      if (dayItems.length < 2) continue
      const color = getDayColor(day)
      const coords = dayItems.map((i) => [i._coords.lat, i._coords.lng] as [number, number])
      const line = L.polyline(coords, { color, weight: 3, opacity: 0.9 })
      line.addTo(mapInstance!)
      routeLines.push(line)
    }

    // Thin connector between days
    for (let i = 0; i < dayKeys.length - 1; i++) {
      const lastArr = dayGroups.get(dayKeys[i])!
      const last = lastArr[lastArr.length - 1]
      const next = dayGroups.get(dayKeys[i + 1])![0]
      const conn = L.polyline(
        [[last._coords.lat, last._coords.lng], [next._coords.lat, next._coords.lng]],
        { color: '#9CA3AF', weight: 1.5, dashArray: '4,5', opacity: 0.6 },
      )
      conn.addTo(mapInstance!)
      routeLines.push(conn)
    }
  }

  if (items.length > 0) {
    mapInstance.fitBounds(markerGroup.getBounds(), { padding: [40, 40] })
  }

  // Restore active pin highlight after re-render
  highlightStep(activeStepIndex.value)
}

function fitAll() {
  if (!mapInstance || !markerGroup) return
  mapInstance.fitBounds(markerGroup.getBounds(), { padding: [40, 40] })
}

async function refresh(items: AgendaItem[]) {
  resolving.value = true
  sorted.value = await resolveCoordinates(items)
  resolving.value = false
  renderMap(filteredItems.value)
}

watch(filteredItems, (items) => {
  activeStepIndex.value = 0
  activeCoordKey = null
  renderMap(items)
})

// ── Stepper ───────────────────────────────────────────────────────────────────
function highlightStep(index: number) {
  if (activeCoordKey) {
    const prev = markerRefs.get(activeCoordKey)
    const prevIcon = normalIcons.get(activeCoordKey)
    if (prev && prevIcon) prev.setIcon(prevIcon)
  }
  const item = filteredItems.value[index]
  if (!item) return
  const key = coordKey(item._coords)
  activeCoordKey = key
  const marker = markerRefs.get(key)
  const icon = activeIcons.get(key)
  if (marker && icon) marker.setIcon(icon)
}

function navigateToStep(index: number) {
  const item = filteredItems.value[index]
  if (!item) return
  highlightStep(index)
  const key = coordKey(item._coords)
  const marker = markerRefs.get(key)
  if (marker && mapInstance) {
    mapInstance.flyTo(item._coords, Math.max(mapInstance.getZoom(), 13), { animate: true, duration: 0.5 })
    setTimeout(() => marker.openPopup(), 550)
  }
}

const stepNext = () => {
  if (activeStepIndex.value < filteredItems.value.length - 1) {
    activeStepIndex.value++
    navigateToStep(activeStepIndex.value)
  }
}

const stepPrev = () => {
  if (activeStepIndex.value > 0) {
    activeStepIndex.value--
    navigateToStep(activeStepIndex.value)
  }
}

onMounted(() => {
  mapInstance = L.map('travel-map', { attributionControl: false }).setView([20, 0], 2)

  // Satellite: Esri World Imagery + place name labels overlay
  satelliteBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
  })
  satelliteLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
  })
  // Street: CartoDB Voyager (clean, stylish)
  streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
  })

  // Default: satellite
  satelliteBase.addTo(mapInstance)
  satelliteLabels.addTo(mapInstance)

  mapInstance.on('popupopen', () => {
    setTimeout(() => {
      document.querySelectorAll('.popup-loc-tip').forEach((el) => {
        const htmlEl = el as HTMLElement
        const fullText = htmlEl.dataset.tip ?? ''
        htmlEl.addEventListener('mouseenter', () => showTip(fullText, htmlEl))
        htmlEl.addEventListener('mouseleave', hideTip)
        htmlEl.addEventListener('click', (e) => {
          e.stopPropagation()
          tipEl?.style.display === 'block' ? hideTip() : showTip(fullText, htmlEl)
        })
      })
    }, 50)
  })

  mapInstance.on('popupclose', hideTip)

  refresh(props.agendaItems)
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  routeLines = []
  mapInstance?.remove()
  mapInstance = null
  satelliteBase = null
  satelliteLabels = null
  streetLayer = null
  if (tipEl?.parentNode) {
    tipEl.parentNode.removeChild(tipEl)
    tipEl = null
  }
})

watch(() => props.agendaItems, (items) => refresh(items), { deep: true })

watch(() => props.fullscreen, () => {
  setTimeout(() => mapInstance?.invalidateSize(), 50)
})

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.fullscreen) emit('toggle-fullscreen')
}
</script>

<style scoped>
.travel-map-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.map-filters {
  padding: 8px 12px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.map-filters-top {
  display: flex;
  align-items: flex-start;
}

.filter-sections {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.filter-section {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.filter-section--bordered {
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
}

.tile-toggle {
  display: flex;
  gap: 4px;
}

.tile-btn {
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  font-size: 0.72rem;
  cursor: pointer;
  color: var(--color-text);
  white-space: nowrap;
  transition: border-color 0.12s, background 0.12s;
}

.tile-btn:hover {
  border-color: var(--el-color-primary);
}

.tile-btn.active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  color: var(--el-color-primary);
  font-weight: 600;
}

.filter-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--el-text-color-secondary);
  min-width: 34px;
  padding-top: 5px;
  flex-shrink: 0;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.filter-chip {
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s, opacity 0.12s;
  color: var(--color-text);
  white-space: nowrap;
}

.filter-chip:hover {
  border-color: var(--el-color-primary);
}

.filter-chip.active {
  border-color: #E8795A;
  background: color-mix(in srgb, #E8795A 12%, transparent);
  color: #E8795A;
  font-weight: 600;
}

.filter-chip.excluded {
  opacity: 0.4;
  text-decoration: line-through;
}

.map-area {
  position: relative;
  flex: 1;
  min-height: 300px;
}

.travel-map {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.map-overlay-msg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  z-index: 1000;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.6);
}

.expand-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1000;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 5px 9px;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  color: #444;
  transition: background 0.12s;
}

.expand-btn:hover { background: #f5f5f5; }

.map-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.fit-btn {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #E8795A;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}

.fit-btn:hover {
  background: #f9f9f9;
}

.map-stepper {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 15, 15, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 7px 14px;
  color: #fff;
  box-shadow: 0 2px 14px rgba(0,0,0,0.35);
  white-space: nowrap;
  max-width: calc(100% - 32px);
}

.stepper-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.4rem;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  opacity: 0.75;
  transition: opacity 0.12s;
  flex-shrink: 0;
}

.stepper-btn:disabled { opacity: 0.2; cursor: default; }
.stepper-btn:not(:disabled):hover { opacity: 1; }

.stepper-info {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  overflow: hidden;
}

.stepper-count {
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.5;
  flex-shrink: 0;
}

.stepper-day {
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

.stepper-title {
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
</style>

<style>
/* Global — Leaflet divIcon (not scoped so Leaflet can apply it) */
.travel-pin {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2.5px solid rgba(255,255,255,0.9);
  box-shadow: 0 2px 8px rgba(0,0,0,0.45);
  position: relative;
}

.pin-emoji {
  font-size: 17px;
  line-height: 1;
  display: block;
}

.pin-seq {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: rgba(0,0,0,0.75);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fff;
  line-height: 1;
}

.pin-badge {
  position: absolute;
  top: -5px;
  right: -7px;
  background: rgba(0,0,0,0.75);
  color: #fff;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 8px;
  line-height: 1.3;
  white-space: nowrap;
  border: 1px solid #fff;
}

.popup-loc-tooltip {
  display: none;
  position: fixed;
  background: rgba(30, 30, 30, 0.92);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  max-width: 260px;
  white-space: normal;
  line-height: 1.4;
  z-index: 10000;
  pointer-events: none;
}

.day-chip {
  border-color: var(--day-color) !important;
}

.day-chip.active {
  background: color-mix(in srgb, var(--day-color) 15%, transparent) !important;
  color: var(--day-color) !important;
}

.travel-pin--active {
  width: 42px !important;
  height: 42px !important;
  box-shadow: 0 0 0 4px rgba(255,255,255,0.55), 0 3px 12px rgba(0,0,0,0.5) !important;
}
</style>
