<template>
  <div class="travel-map-wrapper">
    <!-- Filter bar (shown once items are resolved or there are recommendations to browse) -->
    <div class="map-filters">
      <div class="map-filters-top">
        <div v-if="sorted.length > 0 || (recommendations && recommendations.length > 0)" class="filter-sections">
          <div v-if="recommendations && recommendations.length > 0" class="filter-section">
            <span class="filter-label">{{ t('travel.recommendation.filterLabel') }}</span>
            <div class="filter-chips">
              <button class="filter-chip" :class="{ active: showRecommendations }" @click="showRecommendations = true">
                {{ t('travel.recommendation.filterAll') }}
              </button>
              <button class="filter-chip" :class="{ active: !showRecommendations }" @click="showRecommendations = false">
                {{ t('travel.recommendation.filterSelectedOnly') }}
              </button>
            </div>
          </div>
          <div v-if="sorted.length > 0" class="filter-section filter-section--bordered">
            <span class="filter-label">Type</span>
            <div class="filter-chips">
              <button
                v-for="cat in availableCategories"
                :key="cat"
                class="filter-chip"
                :class="{ excluded: excludedCategories.has(cat) }"
                @click="toggleCategory(cat)"
              >
                <TravelIcon :svg="getCategoryIconSvg(cat)" /> {{ t(`travel.category.${cat}`) }}
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
      <!-- Priority order matters: a ghost pin actually on the map (from
           recommendations, however destinationRef resolved — explicit
           Destination or the sessionTitle fallback) always wins over the
           "fill in Destination" message, since telling the user to fill in
           something that already produced visible pins would be confusing.
           Only fall back to the destination-specific empty state when there
           are truly no pins of any kind (confirmed or ghost) yet. -->
      <div v-if="resolving" class="map-overlay-msg">{{ t('travel.mapStatus.resolving') }}</div>
      <div v-else-if="sorted.length === 0 && (recommendations?.length ?? 0) > 0" key="explore" class="map-empty-label">
        {{ t('travel.recommendation.exploreHint') }}
      </div>
      <div v-else-if="destinationEmpty && sorted.length === 0" key="no-destination" class="map-empty-label">
        {{ t('travel.mapStatus.noDestination') }}
      </div>
      <div v-else-if="sorted.length === 0" key="no-location" class="map-empty-label">
        {{ t('travel.mapStatus.noLocationData') }}
      </div>
      <div v-else-if="filteredItems.length === 0" key="no-filter-matches" class="map-empty-label">
        {{ t('travel.mapStatus.noFilterMatches') }}
      </div>
      <div id="travel-map" class="travel-map"></div>
      <button class="expand-btn" @click="emit('toggle-fullscreen')" :title="fullscreen ? 'Exit fullscreen' : 'Fullscreen'">
        <el-icon><component :is="fullscreen ? ScaleToOriginal : FullScreen" /></el-icon>
      </button>

      <!-- Top-right controls: Fit all + tile toggle stacked -->
      <div class="map-controls">
        <button v-if="filteredItems.length > 0" class="fit-btn" @click="fitAll"><el-icon><Aim /></el-icon> Fit all</button>
        <div class="tile-toggle">
          <button class="tile-btn" :class="{ active: tileMode === 'satellite' }" @click="setTileMode('satellite')"><el-icon><Compass /></el-icon> Sat</button>
          <button class="tile-btn" :class="{ active: tileMode === 'street' }" @click="setTileMode('street')"><el-icon><MapLocation /></el-icon> Map</button>
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

      <!-- Detail side panel — toggled by clicking a "potential place of interest" (ghost) pin -->
      <Transition name="detail-slide">
        <div v-if="selectedRecommendation" class="place-detail-panel">
          <button class="detail-close-btn" type="button" @click="closeDetailPanel" :title="t('travel.recommendation.close')">
            <el-icon><Close /></el-icon>
          </button>

          <div v-if="selectedRecommendation.images?.length" class="detail-gallery">
            <img :src="selectedRecommendation.images[selectedImageIndex]" class="detail-gallery-img" />
            <template v-if="selectedRecommendation.images.length > 1">
              <button class="detail-gallery-nav detail-gallery-nav--prev" type="button"
                @click="selectedImageIndex = (selectedImageIndex - 1 + selectedRecommendation.images.length) % selectedRecommendation.images.length">‹</button>
              <button class="detail-gallery-nav detail-gallery-nav--next" type="button"
                @click="selectedImageIndex = (selectedImageIndex + 1) % selectedRecommendation.images.length">›</button>
              <div class="detail-gallery-dots">
                <span v-for="(img, i) in selectedRecommendation.images" :key="i" class="detail-gallery-dot" :class="{ active: i === selectedImageIndex }" />
              </div>
            </template>
          </div>
          <div v-else class="detail-gallery detail-gallery--empty">
            <TravelIcon :svg="getCategoryIconSvg(selectedRecommendation.category)" />
          </div>

          <div class="detail-body">
            <div class="detail-category-row">
              <TravelIcon :svg="getCategoryIconSvg(selectedRecommendation.category)" />
              <span v-if="selectedRecommendation.category">{{ t(`travel.category.${selectedRecommendation.category}`) }}</span>
              <span v-if="selectedRecommendation.source === 'curated'" class="detail-curated-badge">{{ t('travel.recommendation.curatedBadge') }}</span>
            </div>
            <h3 class="detail-title">{{ selectedRecommendation.title }}</h3>
            <p v-if="selectedRecommendation.description" class="detail-description">{{ selectedRecommendation.description }}</p>
            <p v-else class="detail-description detail-description--empty">{{ t('travel.recommendation.noDetails') }}</p>

            <el-button type="primary" class="detail-add-btn" @click="addSelectedRecommendation">
              {{ t('travel.recommendation.addToTrip') }}
            </el-button>
          </div>
        </div>
      </Transition>
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
import { CATEGORY_ICON_SVG, PIN_ICON_SVG, getCategoryIconSvg } from '@/constants/TravelIconSvg'
import TravelIcon from '@/components/icons/TravelIcon.vue'
import { FullScreen, ScaleToOriginal, Aim, Compass, MapLocation, Close } from '@element-plus/icons-vue'

const DAY_COLORS = ['#60A5FA', '#FBBF24', '#34D399', '#F87171', '#A78BFA', '#FB923C', '#22D3EE', '#F472B6']
const getDayColor = (day: number) => DAY_COLORS[(day - 1) % DAY_COLORS.length]

export interface RecommendationPin {
  key: string
  title: string
  category?: string
  lat: number
  lng: number
  // Opaque to this component — passed straight back through the
  // add-recommendation emit so the caller can tell pin sources apart
  // (e.g. Things-to-do vs Places-to-visit) without a second lookup.
  kind?: string
  description?: string
  images?: string[]
  // 'curated' rows have an admin-editable record (id set); 'overpass'/
  // undefined rows are live lookup results with no backing record to edit.
  source?: 'curated' | 'overpass'
  id?: number
}

const { t } = useI18n()
const props = defineProps<{ agendaItems: AgendaItem[]; fullscreen?: boolean; recommendations?: RecommendationPin[]; destinationEmpty?: boolean }>()
const emit = defineEmits<{ 'toggle-fullscreen': []; 'add-recommendation': [pin: RecommendationPin] }>()

// Use plain variables for Leaflet instances to avoid Vue ref type incompatibility
let mapInstance: LeafletMap | null = null
let markerGroup: FeatureGroup | null = null
let recommendationGroup: FeatureGroup | null = null
let routeLines: L.Polyline[] = []
let tipEl: HTMLDivElement | null = null
const resolving = ref(false)
const recommendationsByKey = new Map<string, RecommendationPin>()
// The detail side panel for "potential place of interest" pins — clicking a
// ghost pin toggles it (click again / different pin / close button).
const selectedRecommendation = ref<RecommendationPin | null>(null)
const selectedImageIndex = ref(0)
// "All" shows recommendation (ghost) pins alongside confirmed picks;
// "Selected only" hides them, showing just what's already been added.
const showRecommendations = ref(true)
let lastRecommendations: RecommendationPin[] = []

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

// Stepper state
const activeStepIndex = ref(0)
let activeCoordKey: string | null = null
let markerRefs: Map<string, L.Marker> = new Map()
let normalIcons: Map<string, L.DivIcon> = new Map()
let activeIcons: Map<string, L.DivIcon> = new Map()

const coordKey = (c: { lat: number; lng: number }) => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`

const iconMarkup = (svgStr: string, size: number, iconColor: string) =>
  `<span style="display:inline-flex;width:${size}px;height:${size}px;color:${iconColor};vertical-align:-${Math.round(size * 0.15)}px">${svgStr}</span>`

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
    } else if (cityRaw.length || item.placeDisplay) {
      const baseName = (item.placeDisplay ?? '').trim()
      const cityParts = cityRaw.map((s) => s.split(',')[0].trim()).filter(Boolean)
      const query = baseName && cityParts.length
        ? [baseName, ...cityParts].join(', ')
        : baseName || cityParts.join(', ')
      if (!query) continue
      if (!firstRequest) await new Promise((r) => setTimeout(r, 400))
      firstRequest = false
      const places = await searchPlaces(query)
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
    const pinIconHtml = iconMarkup(isStacked ? PIN_ICON_SVG : getCategoryIconSvg(first.category), 15, '#fff')
    const badgeHtml = isStacked
      ? `<span class="pin-badge">+${group.length - 1}</span>`
      : `<span class="pin-seq">${seq[0]}</span>`

    const makeIcon = (active: boolean) => L.divIcon({
      className: '',
      html: `<div class="travel-pin${active ? ' travel-pin--active' : ''}" style="background:${color}"><span class="pin-emoji">${pinIconHtml}</span>${badgeHtml}</div>`,
      iconSize: active ? [42, 42] : [36, 36],
      iconAnchor: active ? [21, 21] : [18, 18],
      popupAnchor: [0, -22],
    })

    normalIcons.set(key, makeIcon(false))
    activeIcons.set(key, makeIcon(true))

    const popupRows = group.map((item, idx) => {
      const pIconHtml = iconMarkup(getCategoryIconSvg(item.category), 13, '#111')
      const timeLabel = !item.unknownTime && item.startTime ? ` · ${item.startTime}` : ''
      const dateLabel = item.date
        ? `Day ${item._day} · ${new Date(`${item.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
        : `Day ${item._day}`
      const resolvedCityRaw: string[] = item.cityRaw?.length
        ? item.cityRaw
        : (() => { try { return JSON.parse((item as any).city ?? '[]') } catch { return [] } })()
      const locationLabel = item.placeDisplay || resolvedCityRaw[0] || ''
      const locationLine = locationLabel
        ? `<div class="popup-loc-tip" data-tip="${locationLabel}" style="font-size:0.75rem;color:#888;margin-top:1px;cursor:default"><span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${iconMarkup(PIN_ICON_SVG, 11, '#888')} ${locationLabel}</span></div>`
        : ''
      const sep = idx > 0 ? '<hr style="margin:5px 0;border:none;border-top:1px solid #eee">' : ''
      return `${sep}<div style="font-size:0.88rem;font-weight:600;color:#111"><span style="opacity:0.45;font-weight:400">#${seq[idx]}</span> ${pIconHtml} ${item.title}</div><div style="font-size:0.78rem;color:#666;margin-top:2px">${dateLabel}${timeLabel}</div>${locationLine}`
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

  fitToVisible()

  // Restore active pin highlight after re-render
  highlightStep(activeStepIndex.value)
}

// Bounds spanning whichever of confirmed-item pins / recommendation pins are
// currently on the map, so browsing recommendations before adding anything
// still zooms somewhere useful instead of the default world view.
function fitToVisible() {
  if (!mapInstance) return
  const groups = [markerGroup, recommendationGroup].filter(
    (g): g is FeatureGroup => !!g && g.getLayers().length > 0,
  )
  if (groups.length === 0) return
  let bounds: L.LatLngBounds | undefined
  for (const g of groups) {
    bounds = bounds ? bounds.extend(g.getBounds()) : g.getBounds()
  }
  if (bounds) mapInstance.fitBounds(bounds, { padding: [40, 40] })
}

function fitAll() {
  fitToVisible()
}

// ── Recommendation (not-yet-added) pins — a separate layer so they can be
// cleared/redrawn independently of the confirmed-items markerGroup. Ghost
// style (outlined, 50% opacity, "+" badge) distinguishes them from solid
// confirmed pins. `showRecommendations` (the "All"/"Selected only" filter)
// just re-renders from `lastRecommendations` — no re-fetch needed.
function renderRecommendations(pins: RecommendationPin[]) {
  if (!mapInstance) return
  lastRecommendations = pins

  // If the pin the detail panel is showing has dropped out of the list
  // (e.g. it was just added to the trip), close the panel instead of
  // leaving it pointed at stale data.
  if (selectedRecommendation.value && !pins.some((p) => p.key === selectedRecommendation.value!.key)) {
    selectedRecommendation.value = null
  }

  if (recommendationGroup) { recommendationGroup.clearLayers(); recommendationGroup.removeFrom(mapInstance) }
  recommendationsByKey.clear()
  recommendationGroup = L.featureGroup()

  if (showRecommendations.value) {
    for (const pin of pins) {
      recommendationsByKey.set(pin.key, pin)
      const pinIconHtml = iconMarkup(getCategoryIconSvg(pin.category), 13, '#555')
      const icon = L.divIcon({
        className: '',
        html: `<div class="travel-pin travel-pin--ghost"><span class="pin-emoji">${pinIconHtml}</span><span class="pin-plus">+</span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const marker = L.marker([pin.lat, pin.lng], { icon })
      // Click toggles the detail side panel (see .place-detail-panel below)
      // instead of a Leaflet popup — same pin again closes it.
      marker.on('click', () => {
        selectedImageIndex.value = 0
        selectedRecommendation.value = selectedRecommendation.value?.key === pin.key ? null : pin
      })
      marker.addTo(recommendationGroup)
    }
  }

  recommendationGroup.addTo(mapInstance)
  fitToVisible()
}

function closeDetailPanel() {
  selectedRecommendation.value = null
}

function addSelectedRecommendation() {
  if (!selectedRecommendation.value) return
  emit('add-recommendation', selectedRecommendation.value)
  selectedRecommendation.value = null
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
  renderRecommendations(props.recommendations ?? [])
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
  recommendationGroup = null
  if (tipEl?.parentNode) {
    tipEl.parentNode.removeChild(tipEl)
    tipEl = null
  }
})

watch(() => props.agendaItems, (items) => refresh(items), { deep: true })
watch(() => props.recommendations, (pins) => renderRecommendations(pins ?? []))
watch(showRecommendations, () => renderRecommendations(lastRecommendations))

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
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

/* Unlike .map-overlay-msg, this never washes the whole map — recommendation
   (ghost) pins can still be showing underneath even when there are no
   confirmed agenda items yet, and a full-bleed tint made them look inert. */
/* Top-anchored (below the corner buttons, top: 12px / ~30px tall) and
   accent-colored rather than the old bottom neutral pill — this is an
   active nudge ("fill in Destination" / "tap a marker"), not passive status
   text, so it should read as something to act on, not something to ignore. */
.map-empty-label {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: none;
  max-width: calc(100% - 32px);
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  color: #fff;
  background: var(--el-color-primary);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
  animation: map-empty-label-in 0.35s ease;
}

@keyframes map-empty-label-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.96); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}


.expand-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

/* ── Place detail side panel ─────────────────────────────────────────── */
.place-detail-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(320px, 88%);
  z-index: 1100;
  background: #fff;
  box-shadow: -4px 0 20px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.detail-slide-enter-active,
.detail-slide-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.detail-slide-enter-from,
.detail-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.detail-close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #333;
}

.detail-gallery {
  position: relative;
  width: 100%;
  height: 180px;
  flex-shrink: 0;
  background: #f0f0f0;
}

.detail-gallery--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
}

.detail-gallery--empty :deep(svg) {
  width: 48px;
  height: 48px;
}

.detail-gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.detail-gallery-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.45);
  color: #fff;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-gallery-nav--prev { left: 8px; }
.detail-gallery-nav--next { right: 8px; }

.detail-gallery-dots {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 5px;
}

.detail-gallery-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.55);
}

.detail-gallery-dot.active {
  background: #fff;
}

.detail-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-category-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
}

.detail-category-row :deep(svg) {
  width: 14px;
  height: 14px;
}

.detail-curated-badge {
  margin-left: auto;
  background: var(--el-color-success-light-8, #e1f3d8);
  color: var(--el-color-success, #67c23a);
  border-radius: 10px;
  padding: 1px 8px;
  text-transform: none;
  letter-spacing: normal;
  font-size: 0.68rem;
}

.detail-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #111;
  margin: 0;
}

.detail-description {
  font-size: 0.85rem;
  line-height: 1.5;
  color: #555;
  margin: 0;
}

.detail-description--empty {
  color: #aaa;
  font-style: italic;
}

.detail-add-btn {
  margin-top: 8px;
  width: 100%;
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

.travel-pin--ghost {
  background: #fff !important;
  border: 2px dashed #888 !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25) !important;
  opacity: 0.5;
  transition: opacity 0.12s;
}

.travel-pin--ghost:hover {
  opacity: 0.85;
}

.travel-pin--ghost .pin-emoji {
  font-size: 13px;
}

.pin-plus {
  position: absolute;
  bottom: -3px;
  right: -3px;
  background: var(--el-color-primary, #E8795A);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fff;
  line-height: 1;
}

.popup-add-btn {
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 4px 8px;
  background: var(--el-color-primary, #E8795A);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.popup-add-btn:hover {
  filter: brightness(1.08);
}
</style>
