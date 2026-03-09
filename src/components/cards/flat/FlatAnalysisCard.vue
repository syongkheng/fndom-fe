<script setup lang="ts">
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { BusRouteInformation } from '@/interfaces/BusRouteInformation.model'
import type { BusstopInformation } from '@/interfaces/BusstopInformation.model'
import type { MrtStationInformation } from '@/interfaces/MrtStationInformation.model'
import type { OneMapResult } from '@/interfaces/OneMapResult.model'
import { computed, onMounted, ref } from 'vue'
import BusstopInformationComponent from '@/components/cards/pphs/BusstopInformationComponent.vue'
import ResalePriceSection from './ResalePriceSection.vue'

const props = defineProps<{
  result: OneMapResult
}>()

const proximityInMeters = ref<number>(0)
const busstopRecords = ref<BusstopInformation[]>([])
const mrtStationRecords = ref<MrtStationInformation[]>([])
const busServicesByBusstop = ref<Record<string, BusRouteInformation[]>>({})
const busstopCounts = ref<number>(0)

const formattedProximity = computed(() =>
  proximityInMeters.value >= 1000
    ? `${(proximityInMeters.value / 1000).toFixed(1)} km`
    : `${proximityInMeters.value} m`
)

const displayName = computed(() => {
  if (props.result.BUILDING && props.result.BUILDING !== 'NIL') return props.result.BUILDING
  return `${props.result.BLK_NO} ${props.result.ROAD_NAME}`.trim()
})

const googleMapsUrl = computed(() =>
  `https://www.google.com/maps/search/?api=1&query=${props.result.LATITUDE},${props.result.LONGITUDE}`
)

const retrieveBusstops = async () => {
  try {
    const response = await HttpClient.post(ApiRoute.PPHS.GET_NEAREST_BUSSTOPS, {
      lat: props.result.LATITUDE,
      lng: props.result.LONGITUDE,
      radius: proximityInMeters.value,
    }).then((res) => res.data.data as { rows: BusstopInformation[]; count: number })

    busstopRecords.value = response.rows
    busstopCounts.value = response.count
    await retrieveBusServicesParallel()
  } catch (error) {
    console.error('Failed to fetch bus stops', error)
  }
}

const retrieveBusServicesParallel = async () => {
  try {
    const requests = busstopRecords.value.map((busstop) =>
      HttpClient.post(ApiRoute.LTA.GET_BUS_SVC_BY_BUSSTOP_CODE, { busStopCode: busstop.busstop_code })
        .then((res) => ({ code: busstop.busstop_code, data: res.data.data }))
        .catch(() => ({ code: busstop.busstop_code, data: [] }))
    )
    const results = await Promise.all(requests)
    results.forEach((r) => {
      busServicesByBusstop.value[r.code] = r.data.rows
    })
  } catch (error) {
    console.error('Error fetching bus services', error)
  }
}

const retrieveMrtStops = async () => {
  try {
    const response = await HttpClient.post(ApiRoute.PPHS.GET_NEAREST_MRT_STATIONS, {
      lat: props.result.LATITUDE,
      lng: props.result.LONGITUDE,
      limit: 3,
    }).then((res) => res.data.data.rows)
    mrtStationRecords.value = response
  } catch (error) {
    console.error('Error fetching MRT stations', error)
  }
}

const resaleSectionRef = ref<InstanceType<typeof ResalePriceSection>>()
const resaleFetched = ref(false)

const onCollapseChange = (active: string[]) => {
  if (active.includes('resale') && !resaleFetched.value) {
    resaleFetched.value = true
    resaleSectionRef.value?.fetch()
  }
}

onMounted(() => {
  retrieveMrtStops()
})
</script>

<template>
  <div class="flat-card">
    <!-- Card top -->
    <div class="card-top">
      <div class="card-main">
        <div class="name">{{ displayName }}</div>
        <div class="address">📍 {{ result.ADDRESS }}</div>
        <div class="coords">{{ result.LATITUDE }}, {{ result.LONGITUDE }}</div>
      </div>
      <div class="card-side">
        <el-button size="small" @click="() => window.open(googleMapsUrl, '_blank')">Maps ↗</el-button>
        <div class="postal-chip">
          <span class="postal-label">Postal</span>
          <span class="postal-value">{{ result.POSTAL }}</span>
        </div>
      </div>
    </div>

    <!-- MRT stations -->
    <div v-if="mrtStationRecords?.length" class="mrt-row">
      <span class="section-label">Nearest MRT / LRT</span>
      <div class="mrt-tags">
        <span v-for="station in mrtStationRecords" :key="station.station" class="mrt-tag">
          {{ station.station }}
          <span class="mrt-dist">~{{ Number(station.distance_m).toFixed(0) }}m</span>
        </span>
      </div>
    </div>

    <!-- Collapse sections -->
    <el-collapse expand-icon-position="left" class="card-collapse" @change="onCollapseChange">
      <el-collapse-item name="resale">
        <template #title>
          <span class="collapse-title">Resale price history</span>
        </template>
        <ResalePriceSection
          ref="resaleSectionRef"
          :block="result.BLK_NO"
          :streetName="result.ROAD_NAME"
        />
      </el-collapse-item>

      <el-collapse-item name="1">
        <template #title>
          <span class="collapse-title">Bus stop info</span>
        </template>

        <div class="busstop-section">
          <div class="proximity-row">
            <span class="section-label">
              Within <strong>{{ formattedProximity }}</strong> —
              <strong>{{ busstopCounts }}</strong> stop{{ busstopCounts !== 1 ? 's' : '' }}
            </span>
          </div>
          <div class="slider-wrap">
            <el-slider
              v-model="proximityInMeters"
              :step="500" :min="0" :max="2000"
              show-stops :show-tooltip="false"
              @change="retrieveBusstops"
            />
            <div class="slider-scale">
              <span>0 m</span>
              <span>2 km</span>
            </div>
          </div>
          <div class="section-label" style="margin-bottom: 8px;">
            Nearest {{ busstopRecords.length }} stops
          </div>
          <BusstopInformationComponent :records="busstopRecords" :busServices="busServicesByBusstop" />
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.flat-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s;
}

.flat-card:hover {
  border-color: var(--el-color-primary);
}

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

.name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1.3;
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

.card-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.postal-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.postal-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.4;
}

.postal-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

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
</style>
