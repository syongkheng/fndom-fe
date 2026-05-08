<script lang="ts" setup>
import InitialTravelPlanDialog from '@/components/dialogs/LoginAdvisoryDialog.vue';
import { h, ref, computed, watch, onMounted } from 'vue';
import { Expand, Fold, Share, View, Delete, FolderAdd } from '@element-plus/icons-vue';
import { useItineraryStore } from '@/stores/itinerary';
import { storeToRefs } from 'pinia';
import { CountryList } from '@/constants/Country';
import {
  ElRow,
  ElCol,
  ElTooltip,
  ElButton,
} from 'element-plus';
import { StorageKey, StorageUtils } from '@/utilities/StorageUtils';
import { GeneratorUtils } from '@/utilities/GeneratorUtils';
import { createTravelPlannerVTableColumns } from './TravelPlannerVTableColumns';

const itineraryStore = useItineraryStore();
const { itinerary } = storeToRefs(itineraryStore);

const ifPageViewIsSummary = ref(false);

const handleShareClick = () => {
  console.log("Share button clicked");
};

const addAgendaItem = () => {
  itinerary.value.agendaItems.push({
    id: `agenda-${Date.now()}`,
    date: '',
    city: '',
    cityRaw: [],
    title: '',
    desc: '',
    unknownTime: true,
    files: [],
    _fileIdsToDelete: [],
    _filesToInsert: [],
    _agendaToFileMapping: [],
  });
};

const removeAgendaItem = (id: string) => {
  const index = itinerary.value.agendaItems.findIndex(i => i.id === id);
  if (index !== -1) {
    itinerary.value.agendaItems.splice(index, 1);
  }
};

/**
 * Table data with "Add row" at bottom
 */
const tableData = computed(() => [
  ...itinerary.value.agendaItems,
  { id: '__add__', isAddRow: true }
]);

const columns = createTravelPlannerVTableColumns(
  addAgendaItem,
  removeAgendaItem,
)

const checkIfIdempotencyKeyExists = () => {
  const key = StorageUtils.get(StorageKey.ITINERARY_IDEMPOTENCY_KEY) as string | null;
  return !!key;
}

const configureIdempotencyKey = () => {
  const exists = checkIfIdempotencyKeyExists();
  if (!exists) {
    const newKey = GeneratorUtils.generateUUID();
    StorageUtils.set(StorageKey.ITINERARY_IDEMPOTENCY_KEY, newKey, 'local');
    itinerary.value.idempotencyKey = newKey;
  } else {
    const existingKey = StorageUtils.get(StorageKey.ITINERARY_IDEMPOTENCY_KEY, 'local') as string;
    itinerary.value.idempotencyKey = existingKey;
  }
}

onMounted(() => {
  configureIdempotencyKey();
})

watch(
  () => itinerary.value,
  (newItinerary) => {
    console.log("Itinerary updated:", newItinerary);
  },
  { deep: true }
);
</script>

<template>
  <div class="travel-home-view">
    <!-- Header -->
    <section class="header-section">
      <div class="overview">
        <h2>Overview</h2>
      </div>
      <div class="menu">
        <el-tooltip effect="dark" :content="ifPageViewIsSummary ? 'Show detailed view' : 'Show summary view'"
          placement="bottom">
          <el-button @click="ifPageViewIsSummary = !ifPageViewIsSummary" :icon="ifPageViewIsSummary ? Expand : Fold"
            circle />
        </el-tooltip>

        <el-tooltip effect="dark" content="Share plan" placement="bottom">
          <el-button @click="handleShareClick" :icon="Share" circle />
        </el-tooltip>
      </div>
    </section>

    <!-- High-level inputs -->
    <section class="high-level-section">
      <el-row :gutter="20" align="bottom">
        <el-col :span="8">
          <div class="questionnaire">
            <p>Travelling to</p>
            <el-select v-model="itinerary.country" placeholder="Select country" :options="CountryList" filterable
              size="small" />
          </div>
        </el-col>

        <el-col :span="8">
          <div class="questionnaire">
            <p>Number of travellers</p>
            <el-input-number v-model="itinerary.numberOfPax" :min="1" style="width: 100%;" size="small" />
          </div>
        </el-col>

        <el-col :span="8">
          <div class="overview-menu">
            <div>
              <el-button type="primary" @click="$emit('open-initial-travel-plan-dialog')"
                :icon="FolderAdd">Save</el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- Table -->
    <section class="table-section">
      <el-auto-resizer>
        <template #default="{ width, height }">
          <el-table-v2 :columns="columns" :data="tableData" :width="width" :height="height" border />
        </template>
      </el-auto-resizer>
    </section>

    <InitialTravelPlanDialog />
  </div>
</template>

<style scoped>
.travel-home-view {
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  width: 100%;
  height: 100%;
  justify-self: center;
  padding: 1rem;
  box-sizing: border-box;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.high-level-section {
  margin-bottom: 1rem;
}

.overview-menu {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.table-section {
  flex: 1;
  width: 100%;
}
</style>
