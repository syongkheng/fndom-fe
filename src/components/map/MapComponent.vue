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

      marker.bindPopup(`
        <strong>${record.town}</strong><br>
        ${record.address}<br>
        <em>Expiry:</em> ${record.siteExpiry}<br>
        ${Object.entries(record.flatTypes || {})
          .map(([type, count]) => `${type}: ${count}`)
          .join(", ")}<br>
        ${record.formedUrl
          ? `<a href="${record.formedUrl}" target="_blank">View on Google Maps</a>`
          : ""
        }
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
