<script setup lang="ts">
import { ApiRoute } from '@/constants/ApiRoute';
import HttpClient from '@/interceptors/HttpClient';
import type { BusRouteInformation } from '@/interfaces/BusRouteInformation.model';
import type { BusstopInformation } from '@/interfaces/BusstopInformation.model';
import type { MrtStationInformation } from '@/interfaces/MrtStationInformation.model';
import type { PphsRecord } from '@/interfaces/PphsRecord.model';
import { EditPen } from '@element-plus/icons-vue'
import { computed, onMounted, ref } from 'vue';
import BusstopInformationComponent from './BusstopInformationComponent.vue';
import { useLayoutStateStore } from '@/stores/layoutState';
import { usePphsStore } from '@/stores/pphs';
import { usePermission } from '@/composables/usePermission';
import RoleGuard from '@/components/wrappers/RoleGuard.vue';

const { hasModuleAccess } = usePermission()
const proximityInMeters = ref<number>(0);
const busstopRecords = ref<BusstopInformation[]>([])
const mrtStationRecords = ref<MrtStationInformation[]>([])
const busServicesByBusstop = ref<Record<string, BusRouteInformation[]>>({});
const busstopCounts = ref<number>(0);
const layoutStore = useLayoutStateStore();
const pphsStore = usePphsStore();

const props = defineProps<{
  record: PphsRecord
}>()

const isMapped = computed(() => props.record.source === 'database')

const formattedProximity = computed(() => {
  return proximityInMeters.value >= 1000
    ? `${(proximityInMeters.value / 1000).toFixed(1)} km`
    : `${proximityInMeters.value} m`;
});

const retrieveBusstopsWithinProximityToPphs = async (pphs: PphsRecord) => {
  try {
    const response = await HttpClient.post(ApiRoute.PPHS.GET_NEAREST_BUSSTOPS, {
      lat: pphs.lat,
      lng: pphs.lng,
      radius: proximityInMeters.value,
    }).then((res) => res.data.data as { rows: BusstopInformation[], count: number })

    busstopRecords.value = response.rows
    busstopCounts.value = response.count
    await retrieveBusServicesParallel()
  } catch (error) {
    console.error("Something went wrong.", error)
  }
}

const retrieveBusServicesParallel = async () => {
  try {
    const requests = busstopRecords.value.map(busstop =>
      HttpClient.post(ApiRoute.LTA.GET_BUS_SVC_BY_BUSSTOP_CODE, { busStopCode: busstop.busstop_code })
        .then(res => ({ code: busstop.busstop_code, data: res.data.data }))
        .catch(() => ({ code: busstop.busstop_code, data: [] }))
    );
    const results = await Promise.all(requests);
    results.forEach(r => { busServicesByBusstop.value[r.code] = r.data.rows; });
  } catch (error) {
    console.error("Error fetching bus services", error);
  }
};

const retrieveMrtStops = async (pphs: PphsRecord) => {
  try {
    const response = await HttpClient.post(ApiRoute.PPHS.GET_NEAREST_MRT_STATIONS, {
      lat: pphs.lat,
      lng: pphs.lng,
      limit: 3
    }).then((res) => res.data.data.rows)
    return response
  } catch (error) {
    console.error("Error fetching MRT stations", error);
  }
}

const openFormedUrl = () => {
  window.open(props.record.formedUrl, '_blank')
}

const onClickAdminEditRecord = (record: PphsRecord) => {
  if (!hasModuleAccess('PPHS', 5)) return
  pphsStore.selectedRecord = record
  layoutStore.hdbManagePphsDialog.setTrue()
}

onMounted(async () => {
  mrtStationRecords.value = await retrieveMrtStops(props.record)
})
</script>

<template>
  <div class="pphs-card">

    <!-- Admin bar -->
    <RoleGuard module="PPHS" :min-level="5">
      <div class="admin-bar">
        <span class="admin-label">Admin</span>
        <el-button type="primary" :icon="EditPen" circle size="small" @click="onClickAdminEditRecord(record)" />
      </div>
    </RoleGuard>

    <!-- Card top -->
    <div class="card-top">
      <div class="card-main">
        <div class="town-row">
          <span class="town">{{ record.town }}</span>
          <span class="source-badge" :class="isMapped ? 'badge--mapped' : 'badge--unmapped'">
            {{ isMapped ? 'On Map' : 'Unmapped' }}
          </span>
        </div>
        <div class="address">📍 {{ record.address }}</div>
        <div v-if="isMapped" class="coords">{{ record.lat }}, {{ record.lng }}</div>
      </div>
      <div class="card-side">
        <el-button size="small" @click="openFormedUrl" :disabled="!record.formedUrl">
          Maps ↗
        </el-button>
        <div class="expiry-chip">
          <span class="expiry-label">Expiry</span>
          <span class="expiry-value">{{ record.siteExpiry }}</span>
        </div>
      </div>
    </div>

    <!-- MRT stations -->
    <div v-if="mrtStationRecords?.length" class="mrt-row">
      <span class="section-label">Nearest MRT / LRT</span>
      <div class="mrt-tags">
        <span v-for="station in mrtStationRecords" :key="station.station" class="mrt-tag">
          {{ station.station }} <span class="mrt-dist">~{{ Number(station.distance_m).toFixed(0) }}m</span>
        </span>
      </div>
    </div>

    <!-- More info collapse -->
    <el-collapse expand-icon-position="left" class="card-collapse">
      <el-collapse-item name="1">
        <template #title>
          <span class="collapse-title">Bus stop info</span>
        </template>

        <div v-if="isMapped" class="busstop-section">
          <div class="proximity-row">
            <span class="section-label">Within <strong>{{ formattedProximity }}</strong> — <strong>{{ busstopCounts }}</strong> stop{{ busstopCounts !== 1 ? 's' : '' }}</span>
          </div>
          <div class="slider-wrap">
            <el-slider
              v-model="proximityInMeters"
              :step="500" :min="0" :max="2000"
              show-stops :show-tooltip="false"
              @change="retrieveBusstopsWithinProximityToPphs(record)"
            />
            <div class="slider-scale">
              <span>0 m</span>
              <span>2 km</span>
            </div>
          </div>
          <div class="section-label" style="margin-bottom: 8px;">Nearest {{ busstopRecords.length }} stops</div>
          <BusstopInformationComponent :records="busstopRecords" :busServices="busServicesByBusstop" />
        </div>
        <div v-else class="unmapped-notice">
          Coordinates unavailable — bus stop information cannot be shown.
        </div>
      </el-collapse-item>
    </el-collapse>

  </div>
</template>

<style scoped>
.pphs-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s;
}

.pphs-card:hover {
  border-color: var(--el-color-primary);
}

/* Admin bar */
.admin-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.admin-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.5;
}

/* Card top */
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.town-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.town {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
}

.source-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border-radius: 20px;
}

.badge--mapped {
  background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
  color: var(--el-color-success);
  border: 1px solid color-mix(in srgb, var(--el-color-success) 30%, transparent);
}

.badge--unmapped {
  background: color-mix(in srgb, var(--el-color-danger) 10%, transparent);
  color: var(--el-color-danger);
  border: 1px solid color-mix(in srgb, var(--el-color-danger) 25%, transparent);
}

.address {
  font-size: 0.88rem;
  color: var(--color-text);
  line-height: 1.4;
}

.coords {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.45;
  font-variant-numeric: tabular-nums;
}

/* Side */
.card-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.expiry-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.expiry-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.4;
}

.expiry-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-heading);
}

/* MRT row */
.mrt-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.55;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mrt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mrt-tag {
  font-size: 0.78rem;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 4px;
}

.mrt-dist {
  opacity: 0.5;
  font-size: 0.72rem;
}

/* Collapse */
.card-collapse {
  border: none;
  --el-collapse-border-color: var(--color-border);
}

.card-collapse :deep(.el-collapse-item__header) {
  background: transparent;
  font-size: 0.82rem;
  color: var(--color-text);
  border-bottom-color: var(--color-border);
  height: 36px;
}

.card-collapse :deep(.el-collapse-item__wrap) {
  background: transparent;
  border-bottom: none;
}

.card-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 0;
}

.collapse-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--el-color-primary);
}

/* Bus stop section */
.busstop-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}

.proximity-row {
  font-size: 0.82rem;
  color: var(--color-text);
}

.slider-wrap {
  padding: 0 4px;
}

.slider-scale {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.45;
  margin-top: 2px;
}

.unmapped-notice {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.55;
  padding: 8px 0;
  font-style: italic;
}
</style>
