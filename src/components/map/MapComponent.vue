<template>
  <div v-if="isOnline" id="map"></div>
  <div v-else class="map-offline">
    <span class="map-offline-icon">🗺️</span>
    <span class="map-offline-title">Map unavailable</span>
    <span class="map-offline-desc">Network connection required to load map tiles</span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, nextTick } from "vue";
import L, { Map as LeafletMap, FeatureGroup, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PphsRecord } from "@/interfaces/PphsRecord.model";

import markerIconUrl from "@/assets/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

const props = defineProps<{ records: PphsRecord[] }>();

const isOnline = ref(navigator.onLine);
const map = ref<LeafletMap>();
let markerGroup: FeatureGroup | null = null;

const getCardId = (town: string, address: string) =>
  `pphs-card-${(town + '-' + address).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

const customIcon = L.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const initMap = () => {
  const leafletMap = L.map("map", {
    zoomAnimation: true,
    markerZoomAnimation: true,
    zoomSnap: 0.25,
  }).setView([1.3521, 103.8198], 12);
  map.value = leafletMap;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors | Awense",
  }).addTo(leafletMap);

  renderMarkers(props.records);
};

const renderMarkers = (newRecords: PphsRecord[]) => {
  if (!map.value) return;

  if (markerGroup) {
    markerGroup.clearLayers();
    markerGroup.removeFrom(map.value);
  }

  markerGroup = L.featureGroup();

  const validRecords = newRecords.filter(
    (r) => r.lat && r.lng && !isNaN(parseFloat(r.lat)) && !isNaN(parseFloat(r.lng))
  );

  validRecords.forEach((record) => {
    const marker: Marker = L.marker(
      [parseFloat(record.lat), parseFloat(record.lng)],
      { icon: customIcon }
    );

    const cardId = getCardId(record.town, record.address);
    marker.bindPopup(`
      <strong style="font-size:0.95rem">${record.town}</strong><br>
      <span style="font-size:0.82rem;color:#555">${record.address}</span><br>
      <span style="font-size:0.78rem;color:#888">Expiry: ${record.siteExpiry}</span><br>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        ${record.formedUrl ? `<a href="${record.formedUrl}" target="_blank" style="font-size:0.8rem">Google Maps ↗</a>` : ''}
        <a href="javascript:void(0)" onclick="window.__pphsScrollToCard('${cardId}')" style="font-size:0.8rem">View card ↓</a>
      </div>
    `);

    marker.addTo(markerGroup!);
  });

  markerGroup.addTo(map.value);

  if (validRecords.length > 0) {
    map.value.fitBounds(markerGroup.getBounds(), { padding: [50, 50] });
  }
};

const onGoOnline = () => {
  isOnline.value = true;
  nextTick(() => { if (!map.value) initMap(); });
};
const onGoOffline = () => { isOnline.value = false; };

onMounted(() => {
  window.addEventListener('online', onGoOnline);
  window.addEventListener('offline', onGoOffline);
  if (isOnline.value) initMap();
});

onUnmounted(() => {
  window.removeEventListener('online', onGoOnline);
  window.removeEventListener('offline', onGoOffline);
});

watch(() => props.records, renderMarkers, { deep: true });
</script>

<style scoped>
#map {
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
