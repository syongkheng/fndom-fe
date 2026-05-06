<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Loading, RefreshRight, WarningFilled } from '@element-plus/icons-vue'
import type { PphsRecord } from '@/interfaces/PphsRecord.model'

export interface CoordinateOption {
  source: 'onemap' | 'nominatim'
  lat: string
  lng: string
  formedUrl: string
}

const props = defineProps<{
  visible: boolean
  record: PphsRecord
  options: CoordinateOption[]
  loading: boolean
  error: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [option: CoordinateOption]
  retry: []
}>()

const SOURCE_COLORS: Record<string, string> = {
  onemap:    '#0a7ea4',
  nominatim: '#e08a00',
}

const SOURCE_LABELS: Record<string, string> = {
  onemap:    'OneMap (SLA)',
  nominatim: 'OSM / Nominatim',
}

const mapContainerRef = ref<HTMLElement>()
let mapInstance: L.Map | null = null
let markersGroup: L.FeatureGroup | null = null

const makeIcon = (color: string, num: number) =>
  L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;">${num}</div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
    popupAnchor:[0, -16],
  })

const renderMarkers = () => {
  if (!mapInstance) return
  if (markersGroup) {
    markersGroup.clearLayers()
    markersGroup.removeFrom(mapInstance)
  }
  markersGroup = L.featureGroup()
  props.options.forEach((opt, i) => {
    const marker = L.marker(
      [parseFloat(opt.lat), parseFloat(opt.lng)],
      { icon: makeIcon(SOURCE_COLORS[opt.source] ?? '#888', i + 1) }
    )
    marker.bindPopup(
      `<strong>${SOURCE_LABELS[opt.source] ?? opt.source}</strong><br>` +
      `<span style="font-size:0.8rem">${opt.lat}, ${opt.lng}</span>`
    )
    markersGroup!.addLayer(marker)
  })
  markersGroup.addTo(mapInstance)
  if (props.options.length > 0) {
    mapInstance.fitBounds(markersGroup.getBounds(), { padding: [48, 48] })
  } else {
    mapInstance.setView([1.3521, 103.8198], 12)
  }
}

const initMap = () => {
  if (!mapContainerRef.value) return
  if (mapInstance) { mapInstance.remove(); mapInstance = null }
  mapInstance = L.map(mapContainerRef.value, {
    zoomAnimation:       true,
    markerZoomAnimation: true,
    zoomSnap:            0.25,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:     19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(mapInstance)
  renderMarkers()
}

const destroyMap = () => {
  if (mapInstance) { mapInstance.remove(); mapInstance = null; markersGroup = null }
}

const onDialogOpened = async () => {
  await nextTick()
  initMap()
}

watch(() => props.options, renderMarkers)

onUnmounted(destroyMap)
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="Pick Coordinate Source"
    width="500px"
    @close="emit('close')"
    @opened="onDialogOpened"
    @closed="destroyMap"
  >
    <div class="picker-address">📍 {{ record.address }}</div>

    <div ref="mapContainerRef" class="picker-map" />

    <div v-if="loading" class="picker-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Fetching coordinates…</span>
    </div>
    <div v-else-if="error" class="picker-state picker-error">
      <el-icon><WarningFilled /></el-icon>
      <span>Failed to fetch coordinates. Check that the server is running.</span>
      <el-button size="small" :icon="RefreshRight" @click="emit('retry')">Retry</el-button>
    </div>
    <div v-else-if="options.length === 0" class="picker-state picker-empty">
      No coordinates found from any source.
      <el-button size="small" :icon="RefreshRight" @click="emit('retry')">Retry</el-button>
    </div>
    <div v-else class="picker-list">
      <div v-for="(opt, i) in options" :key="opt.source" class="picker-option">
        <div class="option-dot" :style="{ background: SOURCE_COLORS[opt.source] }">{{ i + 1 }}</div>
        <div class="option-info">
          <span class="option-source">{{ SOURCE_LABELS[opt.source] ?? opt.source }}</span>
          <span class="option-coords">{{ opt.lat }}, {{ opt.lng }}</span>
        </div>
        <el-button size="small" type="primary" plain @click="emit('select', opt)">
          Use this
        </el-button>
      </div>
    </div>

    <template #footer>
      <el-button @click="emit('close')">Cancel</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.picker-address {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 10px;
}

.picker-map {
  height: 260px;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  margin-bottom: 12px;
}

.picker-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.picker-empty {
  flex-direction: column;
  font-style: italic;
  color: var(--color-text-tertiary);
}

.picker-error {
  flex-direction: column;
  color: var(--el-color-danger);
  gap: 10px;
}

.picker-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-mute);
}

.option-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.option-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-source {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
}

.option-coords {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}
</style>
