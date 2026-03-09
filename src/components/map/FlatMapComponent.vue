<template>
  <div v-if="isOnline" id="flat-map"></div>
  <div v-else class="map-offline">
    <span class="map-offline-icon">🗺️</span>
    <span class="map-offline-title">Map unavailable</span>
    <span class="map-offline-desc">Network connection required to load map tiles</span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, nextTick } from 'vue'
import L, { type Map as LeafletMap, type FeatureGroup } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { OneMapResult } from '@/interfaces/OneMapResult.model'

import markerIconUrl from '@/assets/marker-icon.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

const props = defineProps<{ results: OneMapResult[] }>()

const isOnline = ref(navigator.onLine)
const map = ref<LeafletMap>()
let markerGroup: FeatureGroup | null = null

const customIcon = L.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const getCardId = (postal: string, index: number) => `flat-card-${postal}-${index}`

const renderMarkers = (results: OneMapResult[]) => {
  if (!map.value) return

  if (markerGroup) {
    markerGroup.clearLayers()
    markerGroup.removeFrom(map.value)
  }

  markerGroup = L.featureGroup()

  const validResults = results.filter(
    (r) => r.LATITUDE && r.LONGITUDE && !isNaN(parseFloat(r.LATITUDE)) && !isNaN(parseFloat(r.LONGITUDE))
  )

  validResults.forEach((result, index) => {
    const marker = L.marker([parseFloat(result.LATITUDE), parseFloat(result.LONGITUDE)], {
      icon: customIcon,
    })

    const displayName =
      result.BUILDING && result.BUILDING !== 'NIL'
        ? result.BUILDING
        : `${result.BLK_NO} ${result.ROAD_NAME}`.trim()

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${result.LATITUDE},${result.LONGITUDE}`
    const cardId = getCardId(result.POSTAL, index)

    marker.bindPopup(`
      <strong style="font-size:0.95rem">${displayName}</strong><br>
      <span style="font-size:0.82rem;color:#555">${result.ADDRESS}</span><br>
      <span style="font-size:0.78rem;color:#888">Postal: ${result.POSTAL}</span><br>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        <a href="${googleMapsUrl}" target="_blank" style="font-size:0.8rem">Google Maps ↗</a>
        <a href="javascript:void(0)" onclick="window.__flatScrollToCard('${cardId}')" style="font-size:0.8rem">View card ↓</a>
      </div>
    `)

    marker.addTo(markerGroup!)
  })

  markerGroup.addTo(map.value)

  if (validResults.length > 0) {
    map.value.fitBounds(markerGroup.getBounds(), { padding: [50, 50] })
  }
}

const initMap = () => {
  const leafletMap = L.map('flat-map').setView([1.3521, 103.8198], 12)
  map.value = leafletMap

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors | Awense',
  }).addTo(leafletMap)

  renderMarkers(props.results)
}

const onGoOnline = () => {
  isOnline.value = true
  nextTick(() => { if (!map.value) initMap() })
}
const onGoOffline = () => { isOnline.value = false }

onMounted(() => {
  window.addEventListener('online', onGoOnline)
  window.addEventListener('offline', onGoOffline)
  if (isOnline.value) initMap()
})

onUnmounted(() => {
  window.removeEventListener('online', onGoOnline)
  window.removeEventListener('offline', onGoOffline)
})

watch(() => props.results, renderMarkers, { deep: true })
</script>

<style scoped>
#flat-map {
  height: 100%;
  width: 100%;
}

.map-offline {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--color-background-mute);
  color: var(--color-text);
}

.map-offline-icon {
  font-size: 2rem;
  opacity: 0.4;
}

.map-offline-title {
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0.6;
}

.map-offline-desc {
  font-size: 0.78rem;
  opacity: 0.4;
}
</style>
