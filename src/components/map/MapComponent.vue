<template>
  <div id="map"></div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from "vue";
import L, { Map as LeafletMap, FeatureGroup, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PphsRecord } from "@/interfaces/PphsRecord.model";
import { useLayoutStateStore } from "@/stores/layoutState";

// ✅ Import your own marker icon
import markerIconUrl from "@/assets/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

const props = defineProps<{ records: PphsRecord[] }>();
const layoutStore = useLayoutStateStore();

const getCardId = (town: string, address: string) =>
  `pphs-card-${(town + '-' + address).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

const map = ref<LeafletMap>();
let markerGroup: FeatureGroup | null = null;

// ✅ Define a reusable custom icon
const customIcon = L.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

onMounted(() => {
  // layoutStore.loadingDialog.setTrue();

  const leafletMap = L.map("map").setView([1.3521, 103.8198], 12);
  map.value = leafletMap;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors | Awense",
  }).addTo(leafletMap);
});

watch(
  () => props.records,
  (newRecords) => {
    if (!map.value) return;

    // 🔹 Clear previous markers
    if (markerGroup) {
      markerGroup.clearLayers();
      markerGroup.removeFrom(map.value);
    }

    // 🔹 Create new marker group
    markerGroup = L.featureGroup();

    const validRecords = newRecords.filter(
      (r) =>
        r.lat &&
        r.lng &&
        !isNaN(parseFloat(r.lat)) &&
        !isNaN(parseFloat(r.lng))
    );

    validRecords.forEach((record) => {
      const marker: Marker = L.marker(
        [parseFloat(record.lat), parseFloat(record.lng)],
        { icon: customIcon } // ✅ Use custom marker
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

    // 🔹 Add group to map
    markerGroup.addTo(map.value);

    // 🔹 Fit bounds
    if (validRecords.length > 0) {
      map.value.fitBounds(markerGroup.getBounds(), { padding: [50, 50] });
    }

    // layoutStore.loadingDialog.setFalse();
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
#map {
  height: 100%;
  width: 100%;
}
</style>
