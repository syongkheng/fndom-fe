<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { usePphsStore } from "@/stores/pphs";
import type { PphsRecord } from "@/interfaces/PphsRecord.model";

import MapComponent from "@/components/map/MapComponent.vue";
import PphsRecordCard from "@/components/cards/pphs/PphsRecordCard.vue";
import ManagePphsDialog from "@/components/dialogs/ManagePphsDialog.vue";
import PphsCompareDialog from "@/components/dialogs/PphsCompareDialog.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import StatPill from "@/components/common/StatPill.vue";

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

const compareMode = ref(false);
const selectedForCompare = ref<PphsRecord[]>([]);
const compareDialogOpen = ref(false);

const selectionFull = computed(() => selectedForCompare.value.length >= 3);

const toggleCompareMode = () => {
  compareMode.value = !compareMode.value;
  if (!compareMode.value) selectedForCompare.value = [];
};

const toggleSelectRecord = (record: PphsRecord) => {
  const idx = selectedForCompare.value.findIndex((r) => r.address === record.address);
  if (idx !== -1) {
    selectedForCompare.value.splice(idx, 1);
  } else if (!selectionFull.value) {
    selectedForCompare.value.push(record);
  }
};

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
      <StatPill :value="sortedRecords.length" label="Listings" />
      <div class="stat-divider" />
      <StatPill :value="mappedCount" label="On Map" />
      <div class="stat-divider" />
      <StatPill :value="sortedRecords.length - mappedCount" label="Unmapped" />
      <div class="stat-spacer" />
      <el-button link size="small" class="map-toggle-btn" @click="mapExpanded = !mapExpanded">
        {{ mapExpanded ? 'Hide map ▲' : 'Show map ▼' }}
      </el-button>
      <el-button
        link size="small"
        :type="compareMode ? 'danger' : 'primary'"
        class="map-toggle-btn"
        @click="toggleCompareMode"
      >
        {{ compareMode ? 'Cancel' : 'Compare' }}
      </el-button>
    </div>

    <!-- Map -->
    <div class="pphs-map-wrap" :class="{ collapsed: !mapExpanded }">
      <MapComponent :records="pphsRecords" />
    </div>

    <!-- Cards -->
    <div class="pphs-list">
      <EmptyState v-if="!sortedRecords.length" icon="🏠" title="No records found for this batch." />
      <div
        v-for="record in sortedRecords"
        :key="`${record.town}-${record.address}`"
        :id="getCardId(record.town, record.address)"
      >
        <PphsRecordCard
          :record="record"
          :compareMode="compareMode"
          :isSelected="selectedForCompare.some((r) => r.address === record.address)"
          :selectionFull="selectionFull"
          @toggle="toggleSelectRecord(record)"
        />
      </div>
    </div>

  </div>

  <!-- Sticky compare bar -->
  <Transition name="slide-up">
    <div v-if="compareMode" class="compare-bar">
      <span class="compare-bar-hint">
        {{ selectedForCompare.length === 0
          ? 'Select up to 3 listings to compare'
          : `${selectedForCompare.length} of 3 selected` }}
      </span>
      <el-button
        type="primary" size="small"
        :disabled="selectedForCompare.length < 2"
        @click="compareDialogOpen = true"
      >
        Compare {{ selectedForCompare.length >= 2 ? `(${selectedForCompare.length})` : '' }}
      </el-button>
    </div>
  </Transition>

  <ManagePphsDialog :record="selectedRecord" />
  <PphsCompareDialog v-model="compareDialogOpen" :records="selectedForCompare" />
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

/* Compare bar */
.compare-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
  white-space: nowrap;
}

.compare-bar-hint {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateX(-50%) translateY(16px);
  opacity: 0;
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
