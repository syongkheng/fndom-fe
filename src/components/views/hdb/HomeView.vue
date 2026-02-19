<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { usePphsStore } from "@/stores/pphs";

import MapComponent from "@/components/map/MapComponent.vue";
import { ArrowRight } from "@element-plus/icons-vue";
import PphsRecordCard from "@/components/cards/pphs/PphsRecordCard.vue";
import ManagePphsDialog from "@/components/dialogs/ManagePphsDialog.vue";

const pphsStore = usePphsStore();
const { pphsRecords, selectedRecord } = storeToRefs(pphsStore);

const pphsBatch = [
  { value: "202512", label: "December 2025" },
  { value: "202510", label: "October 2025" },
];

const selectedBatchValue = ref(pphsBatch[0].value);

/** Always derive UI from store refs */
const sortedRecords = computed(() =>
  [...pphsRecords.value].sort((a, b) => a.town.localeCompare(b.town))
);

/** Fetch on mount */
onMounted(() => {
  pphsStore.retrieveAllPphsbByBatch(selectedBatchValue.value);
});

/** Optional: auto refetch when batch changes */
watch(selectedBatchValue, (batch) => {
  pphsStore.retrieveAllPphsbByBatch(batch);
});
</script>

<template>
  <div class="page-wrapper">
    <div class="map-form-wrapper">
      <div class="introduction-wrapper">
        <h1>PPHS</h1>
        <p>Take a look at the different available locations and see which one suits you best!</p>
      </div>

      <div class="batch-selection-wrapper">
        <div style="display: flex; gap: 1rem;">
          <el-select v-model="selectedBatchValue" placeholder="Select a batch" style="width: 240px">
            <el-option v-for="item in pphsBatch" :key="item.value" :label="item.label" :value="item.value" />
            <template #footer>
              <p class="subtitle">For more records, contact [[ email ]].</p>
            </template>
          </el-select>

          <!-- 🔥 pass value, not ref -->
          <el-button type="primary" @click="pphsStore.retrieveAllPphsbByBatch(selectedBatchValue)">
            Retrieve
            <el-icon class="el-icon--right">
              <ArrowRight />
            </el-icon>
          </el-button>
        </div>

        <p class="subtitle">*Only past three releases are shown.</p>
      </div>

      <div class="map-container-wrapper">
        <MapComponent :records="pphsRecords" />
      </div>
    </div>

    <div class="summary-wrapper">
      <h2>Summary</h2>

      <div v-for="record in sortedRecords" :key="`${record.town}-${record.address}`">
        <PphsRecordCard :record="record" />
      </div>
    </div>

    <ManagePphsDialog :record="selectedRecord" />
  </div>
</template>

<style scoped>
.map-form-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.summary-wrapper {
  flex: 1;
  overflow: auto;
}

.subtitle {
  font-size: 0.7rem;
  font-style: italic;
  color: #666666;
}

p {
  color: #333333;
}

.page-wrapper {
  display: flex;
  justify-content: center;
  flex-direction: row;
  gap: 1rem;
  width: 1200px;
  justify-self: center;

  height: calc(100vh - 80px - 100px - 2rem);

}

.map-container-wrapper {
  flex: 1;
  /* <-- This is the key: fill remaining space */
  width: 500px;
  border-radius: 1rem;
  overflow: hidden;
  /* optional, if the map overflows */
}

.batch-selection-wrapper {
  margin-bottom: 0.5rem;
}

@media (max-width: 800px) {
  .page-wrapper {
    flex-direction: column;
    height: auto;
    /* let it grow naturally */
    min-height: 100vh;
  }

  .map-form-wrapper {
    width: 100%;
    height: auto;
  }

  .map-container-wrapper {
    width: 90%;
    margin: 0 auto;
    border-radius: 1rem;
    flex: none;
    /* disable flex shrinking/growing */
    height: 60vh;
    /* give it a proper visible height */
  }

  .summary-wrapper {
    max-height: none;
    overflow: visible;
  }
}
</style>
