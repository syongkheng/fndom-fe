<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { usePphsStore } from "@/stores/pphs";
import MapComponent from "@/components/map/MapComponent.vue";
import { ArrowRight } from '@element-plus/icons-vue'
import PphsRecordCard from "@/components/cards/PphsRecordCard.vue";

const pphsStore = usePphsStore();

const pphsBatch = [
  {
    value: "202510",
    label: "October 2025",
  }
]

const selectedBatchValue = ref<string>(pphsBatch[0].value);

const sortedRecords = computed(() =>
  [...pphsStore.pphsRecords].sort((a, b) => a.town.localeCompare(b.town))
);

onMounted(async () => {
  await pphsStore.retrieveAllPphsbByBatch(selectedBatchValue.value);
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
        <div style="display: flex; flex-direction: row; gap: 1rem;">
          <el-select v-model="selectedBatchValue" placeholder="Select a batch" style="width: 240px">
            <el-option v-for="item in pphsBatch" :key="item.value" :label="item.label" :value="item.value" />
            <template #footer>
              <p class="subtitle">For more records, contact [[ email ]].</p>
            </template>
          </el-select>
          <el-button type="primary" @click="pphsStore.retrieveAllPphsbByBatch(selectedBatchValue)"> Retrieve
            <el-icon class="el-icon--right">
              <ArrowRight />
            </el-icon>
          </el-button>
        </div>
        <p class="subtitle">*Only past three releases are shown.</p>
      </div>
      <div class="map-container-wrapper">
        <MapComponent :records="pphsStore.pphsRecords" />
      </div>
    </div>
    <div class="summary-wrapper">
      <h2>
        Summary
      </h2>
      <div>
        <div v-for="value in sortedRecords" :key="value.formedUrl">
          <PphsRecordCard :record="value" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-form-wrapper {
  flex: 1;
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

  @media (min-width: 801px) {
    max-height: calc(100svh - 80px - 170px - 2rem);
  }
}

.map-container-wrapper {
  width: 500px;
  height: 500px;

  border-radius: 1rem;
}

.batch-selection-wrapper {
  margin-bottom: 0.5rem;
}

@media (max-width: 800px) {
  .page-wrapper {
    flex-direction: column;
  }

  .map-container-wrapper {
    width: 90%;
    margin: 0 auto;

    border-radius: 1rem;
  }
}
</style>
