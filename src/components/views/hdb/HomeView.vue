<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { usePphsStore } from "@/stores/pphs";

import MapComponent from "@/components/map/MapComponent.vue";
import PphsRecordCard from "@/components/cards/pphs/PphsRecordCard.vue";
import ManagePphsDialog from "@/components/dialogs/ManagePphsDialog.vue";

const pphsStore = usePphsStore();
const { pphsRecords, selectedRecord } = storeToRefs(pphsStore);

// Auto-generate even-month batches from Oct 2025 up to today — no code changes needed for new releases
const pphsBatch = (() => {
  const batches: { value: string; label: string }[] = []
  const cursor = new Date(2025, 9, 1) // Oct 2025 — earliest known batch
  const now = new Date()
  while (cursor <= now) {
    const month1 = cursor.getMonth() + 1 // 1-indexed
    if (month1 % 2 === 0) {
      const y = cursor.getFullYear()
      const m = String(month1).padStart(2, '0')
      batches.unshift({
        value: `${y}${m}`,
        label: cursor.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return batches.slice(0, 3)
})();

const selectedBatchValue = ref(pphsBatch[0].value);
const mapExpanded = ref(true);

const sortedRecords = computed(() =>
  [...pphsRecords.value].sort((a, b) => a.town.localeCompare(b.town))
);

const mappedCount = computed(() =>
  pphsRecords.value.filter((r) => r.source === "database").length
);

const getCardId = (town: string, address: string) =>
  `pphs-card-${(town + '-' + address).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

onMounted(() => {
  pphsStore.retrieveAllPphsbByBatch(selectedBatchValue.value);
  (window as any).__pphsScrollToCard = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
});

watch(selectedBatchValue, (batch) => {
  pphsStore.retrieveAllPphsbByBatch(batch);
});
</script>

<template>
  <div class="pphs-root">

    <!-- Page header -->
    <div class="pphs-header">
      <div class="pphs-header-text">
        <h1 class="pphs-title">Parenthood Provisional Housing Scheme</h1>
        <p class="pphs-subtitle">Browse available PPHS locations, explore nearby transport, and find the best fit for your family.</p>
      </div>
      <div class="pphs-filter-bar">
        <el-segmented
          v-model="selectedBatchValue"
          :options="pphsBatch.map(b => ({ label: b.label, value: b.value }))"
        />
        <span class="pphs-filter-note">*Past 3 releases only</span>
      </div>
    </div>

    <!-- Stats bar -->
    <div v-if="sortedRecords.length" class="pphs-stats">
      <div class="stat-pill">
        <span class="stat-value">{{ sortedRecords.length }}</span>
        <span class="stat-label">Listings</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-pill">
        <span class="stat-value">{{ mappedCount }}</span>
        <span class="stat-label">On Map</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-pill">
        <span class="stat-value">{{ sortedRecords.length - mappedCount }}</span>
        <span class="stat-label">Unmapped</span>
      </div>
      <div class="stat-spacer" />
      <el-button link size="small" class="map-toggle-btn" @click="mapExpanded = !mapExpanded">
        {{ mapExpanded ? 'Hide map ▲' : 'Show map ▼' }}
      </el-button>
    </div>

    <!-- Map -->
    <div class="pphs-map-wrap" :class="{ collapsed: !mapExpanded }">
      <MapComponent :records="pphsRecords" />
    </div>

    <!-- Cards -->
    <div class="pphs-list">
      <div v-if="!sortedRecords.length" class="pphs-empty">
        <div class="pphs-empty-icon">🏠</div>
        <p>No records found for this batch.</p>
      </div>
      <div
        v-for="record in sortedRecords"
        :key="`${record.town}-${record.address}`"
        :id="getCardId(record.town, record.address)"
      >
        <PphsRecordCard :record="record" />
      </div>
    </div>

  </div>

  <ManagePphsDialog :record="selectedRecord" />
  <el-backtop :right="20" :bottom="24" />
</template>

<style scoped>
.pphs-root {
  max-width: 900px;
  width: 100%;
  justify-self: center;
  display: flex;
  flex-direction: column;
  padding-bottom: 48px;
}

/* Header */
.pphs-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 0 16px;
  flex-wrap: wrap;
}

.pphs-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 6px;
  line-height: 1.2;
}

.pphs-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.65;
  line-height: 1.55;
  max-width: 480px;
  margin: 0;
}

.pphs-filter-bar {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.pphs-filter-note {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.45;
  font-style: italic;
}

/* Stats */
.pphs-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  margin-bottom: 12px;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 44px;
}

.stat-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1;
}

.stat-label {
  font-size: 0.68rem;
  color: var(--color-text);
  opacity: 0.55;
  white-space: nowrap;
}

.stat-divider {
  width: 1px;
  height: 16px;
  background: var(--color-border);
}

.stat-spacer {
  flex: 1;
}

.map-toggle-btn {
  font-size: 0.78rem;
  color: var(--el-color-primary);
  padding: 0;
}

/* Map */
.pphs-map-wrap {
  height: 380px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  margin-bottom: 20px;
  transition: height 0.3s ease, opacity 0.3s ease, margin 0.3s ease;
}

.pphs-map-wrap.collapsed {
  height: 0;
  opacity: 0;
  margin-bottom: 0;
  border: none;
}

/* Cards */
.pphs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pphs-empty {
  text-align: center;
  padding: 60px 0;
  color: var(--color-text);
  opacity: 0.5;
}

.pphs-empty-icon {
  font-size: 2.4rem;
  margin-bottom: 10px;
}

/* Mobile */
@media (max-width: 600px) {
  .pphs-header {
    flex-direction: column;
    padding: 16px 0 12px;
  }

  .pphs-filter-bar {
    align-items: flex-start;
  }

  .pphs-map-wrap {
    height: 260px;
  }

  .pphs-title {
    font-size: 1.15rem;
  }
}
</style>
