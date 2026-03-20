<template>
  <div class="travel-map-wrapper">
    <!-- Filter bar (shown once items are resolved) -->
    <div v-if="sorted.length > 0" class="map-filters">
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
            {{ TRAVEL_CATEGORY_EMOJI[cat] ?? '📋' }} {{ cat.charAt(0).toUpperCase() + cat.slice(1) }}
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
            class="filter-chip"
            :class="{ active: selectedDays.includes(day) }"
            @click="toggleDay(day)"
          >
            Day {{ day }}
          </button>
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
      <button v-if="filteredItems.length > 0" class="fit-btn" @click="fitAll">⊞ Fit all</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import type { Map as LeafletMap, FeatureGroup, Polyline } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { searchPlaces } from '@/composables/useGeocode'
import type { AgendaItem } from '@/interfaces/forms/itinerary/AgendaItem'

const TRAVEL_CATEGORY_EMOJI: Record<string, string> = {
  flight: '✈️', hotel: '🏨', dining: '🍽️', attraction: '🎡',
  transport: '🚌', shopping: '🛍️', entertainment: '🎭', nature: '🌿', other: '📋',
}

const props = defineProps<{ agendaItems: AgendaItem[] }>()

// Use plain variables for Leaflet instances to avoid Vue ref type incompatibility
let mapInstance: LeafletMap | null = null
let markerGroup: FeatureGroup | null = null
let routeLine: Polyline | null = null
const resolving = ref(false)

interface ResolvedItem extends AgendaItem {
  _coords: { lat: number; lng: number }
  _globalIdx: number
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
  const indexMap = new Map(globalOrder.map((item, i) => [item.id ?? item._localIndex, i + 1]))

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
        _globalIdx: indexMap.get(item.id ?? item._localIndex) ?? results.length + 1,
        _day: dateKeyToDayNum.get(toLocalDateKey(item.date)) ?? 1,
      })
    }
  }

  return results
}

// ── Map rendering ─────────────────────────────────────────────────────────────
function renderMap(items: ResolvedItem[]) {
  if (!mapInstance) return

  if (markerGroup) { markerGroup.clearLayers(); markerGroup.removeFrom(mapInstance) }
  if (routeLine) { routeLine.removeFrom(mapInstance) }

  markerGroup = L.featureGroup()

  for (const item of items) {
    const emoji = TRAVEL_CATEGORY_EMOJI[item.category ?? ''] ?? '📋'
    const timeLabel = !item.unknownTime && item.startTime ? ` · ${item.startTime}` : ''

    const icon = L.divIcon({
      className: '',
      html: `<div class="travel-pin">${item._globalIdx}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    })

    const marker = L.marker([item._coords.lat, item._coords.lng], { icon })
    marker.bindPopup(`
      <div style="min-width:140px;max-width:220px">
        <div style="font-size:0.88rem;font-weight:600;color:#111">${emoji} ${item.title}</div>
        <div style="font-size:0.78rem;color:#666;margin-top:4px">Day ${item._day}${timeLabel}</div>
      </div>
    `)
    marker.addTo(markerGroup!)
  }

  markerGroup.addTo(mapInstance)

  if (items.length > 1) {
    const coords = items.map((i) => [i._coords.lat, i._coords.lng] as [number, number])
    routeLine = L.polyline(coords, { color: '#E8795A', weight: 2, dashArray: '6,4' })
    routeLine.addTo(mapInstance)
  }

  if (items.length > 0) {
    mapInstance.fitBounds(markerGroup.getBounds(), { padding: [40, 40] })
  }
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

watch(filteredItems, (items) => renderMap(items))

onMounted(() => {
  mapInstance = L.map('travel-map').setView([20, 0], 2)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  }).addTo(mapInstance)

  refresh(props.agendaItems)
})

onUnmounted(() => {
  mapInstance?.remove()
  mapInstance = null
})

watch(() => props.agendaItems, (items) => refresh(items), { deep: true })
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
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.filter-section {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.filter-section--bordered {
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
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

.fit-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1000;
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
</style>

<style>
/* Global — Leaflet divIcon pin (not scoped so Leaflet can apply it) */
.travel-pin {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #E8795A;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
</style>
