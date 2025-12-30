<script setup lang="ts">
import { ApiRoute } from '@/constants/ApiRoute';
import HttpClient from '@/interceptors/HttpClient';
import type { BusRouteInformation } from '@/interfaces/BusRouteInformation.model';
import type { BusstopInformation } from '@/interfaces/BusstopInformation.model';
import type { MrtStationInformation } from '@/interfaces/MrtStationInformation.model';
import type { PphsRecord } from '@/interfaces/PphsRecord.model';
import { Location, Timer, Link, Compass, EditPen } from '@element-plus/icons-vue'
import { computed, onMounted, ref, watch } from 'vue';
import BusstopInformationComponent from './BusstopInformationComponent.vue';
import { useAuthenticationStore } from '@/stores/authentication';
import { useLayoutStateStore } from '@/stores/layoutState';
import { usePphsStore } from '@/stores/pphs';
import RoleGuard from '@/components/wrappers/RoleGuard.vue';

const { userProfile } = useAuthenticationStore()
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

const remapSourceLabel = {
  "database": "Marked",
  "website": "Marked",
  "google": "Marked",
  "unparseable": "Not on Map",
  "error": "Not on Map",
  "": "Not on Map"
}

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
    }).then((res) => {
      return res.data.data as {
        rows: BusstopInformation[],
        count: number
      }
    })

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
      HttpClient.post(ApiRoute.LTA.GET_BUS_SVC_BY_BUSSTOP_CODE, {
        busStopCode: busstop.busstop_code
      })
        .then(res => ({ code: busstop.busstop_code, data: res.data.data }))
        .catch(() => ({ code: busstop.busstop_code, data: [] }))
    );

    const results = await Promise.all(requests);

    results.forEach(r => {
      busServicesByBusstop.value[r.code] = r.data.rows;
    });
  } catch (error) {
    console.error("Error fetching bus services", error);
  }
};

const retrieveMrtStopsParallel = async (pphs: PphsRecord) => {
  try {
    const response = HttpClient.post(ApiRoute.PPHS.GET_NEAREST_MRT_STATIONS, {
      lat: pphs.lat,
      lng: pphs.lng,
      limit: 3
    }).then((res) => {
      return res.data.data.rows
    })
    return response

  } catch (error) {
    console.error("Error fetching bus services", error);
  }
}

const openFormedUrl = () => {
  window.open(props.record.formedUrl, '_blank')
}


const hasAdminPrevileges = computed(() => {
  return userProfile.role === 'R4' || userProfile.role === 'R5'
})

const onClickAdminEditRecord = (record: PphsRecord) => {
  if (!hasAdminPrevileges.value) {
    return
  }
  pphsStore.selectedRecord = record
  layoutStore.hdbManagePphsDialog.setTrue()
}

onMounted(async () => {
  mrtStationRecords.value = await retrieveMrtStopsParallel(props.record)
})

</script>

<template>
  <el-card shadow="hover" class="pphs-card">
    <!-- Admin Panel -->
    <RoleGuard :roles="['R4', 'R5']">
      <div class="admin-panel">
        <div class="town">Admin Panel</div>
        <div class="admin-panel-action">
          <el-button type="primary" :icon="EditPen" circle @click="onClickAdminEditRecord(record)" />
        </div>
      </div>
    </RoleGuard>
    <!-- Header: Town and Source -->
    <div class="card-header">
      <div class="town">{{ record.town }}</div>
      <el-tag :type="record.source === 'database' ? 'primary' : 'danger'" size="small">
        {{ remapSourceLabel[record.source] }}
      </el-tag>
    </div>

    <!-- Address -->
    <div class="address">
      <div>
        <div>
          <el-icon>
            <Location />
          </el-icon>
          <span>{{ record.address }}</span>
        </div>
        <div>
          <el-icon>
            <Compass />
          </el-icon>
          <span v-if="record.source === 'database'">
            {{ record.lat }}, {{ record.lng }}
          </span>
          <span v-else>
            Coordinates unavailable
          </span>
        </div>
      </div>
      <el-button type="primary" size="small" :icon="Link" @click="openFormedUrl">
        Map
      </el-button>
    </div>

    <!-- Flat Type Information -->
    <!-- <div class="flat-type-grid">
      <div v-for="(count, type) in record.flatTypes" :key="type" class="flat-type-item">
        <div class="type">{{ type }}</div>
        <div class="count">{{ count }}</div>
      </div>
    </div> -->

    <!-- Site Expiry -->
    <div class="expiry">
      <el-icon>
        <Timer />
      </el-icon>
      <span>Site expiry:&nbsp;</span>
      <strong>{{ record.siteExpiry }}</strong>
    </div>



    <el-collapse expand-icon-position="left">
      <el-collapse-item title="More information" name="1">
        <div v-if="record.source.toString() !== 'error'" class="busstop-proximity">
          <div class="mrt-station-information-wrapper">
            <div>Nearest 3 MRT/LRT Stations:</div>
            <div class="mrt-station-tags">
              <el-tag v-for="station in mrtStationRecords" :key="station.station" type="info" size="small"
                class="mrt-station-tag">
                <span class="station-name">{{ station.station }}</span>
                <span class="station-distance">&nbsp;|&nbsp;~{{ Number(station.distance_m).toFixed(0) }} m</span>
              </el-tag>
            </div>
          </div>
          <div class="busstop-information-wrapper">
            <div class="proximity-label">
              Busstops within <strong>{{ formattedProximity }}</strong> : <strong>{{ busstopCounts }}</strong>
            </div>
            <div class="slider-wrapper">
              <el-slider v-model="proximityInMeters" :step="500" :min="0" :max="2000" show-stops :show-tooltip="false"
                @change="retrieveBusstopsWithinProximityToPphs(record)" />
              <div class="slider-scale">
                <span>0 m</span>
                <!-- <span style="display: flex; flex-direction: column; align-items: center;">
                <span>For proximity >2KM</span>
                <span>Please login</span>
              </span> -->
                <span>2 km</span>
              </div>
            </div>
            <div>Busstop Information (Nearest {{ busstopRecords.length }})</div>
            <BusstopInformationComponent :records="busstopRecords" :busServices="busServicesByBusstop" />
          </div>
        </div>
        <div v-else>
          Something went wrong retrieving coordinates, unable to show more information.
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-card>

</template>

<style scoped>
.admin-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 600;
  background-color: #60626620;
  padding: 1rem;
  border-radius: 1rem;
  gap: 0.5rem;
}

.admin-panel-action {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}

.slider-wrapper {
  width: 80%;
  padding-left: 1rem
}

.busstop-proximity {
  margin-top: 12px;
}

.proximity-label {
  font-weight: 500;
  margin-bottom: 6px;
  color: #303133;
}

.slider-scale {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #909399;
  margin-top: 4px;
}

.pphs-card {
  width: 100%;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.town {
  font-size: 1.2rem;
  font-weight: 600;
  color: #303133;
}

.address {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  color: #606266;
  font-size: 0.95rem;
}

.address .el-icon {
  margin-right: 4px;
}

.flat-type-grid {
  display: flex;
  justify-content: space-around;
}

.flat-type-item {
  background: #f9fafc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  text-align: center;
  padding: 6px 10px;
  flex: 1;
  margin: 0 4px;
}

.flat-type-item .type {
  font-weight: 500;
  color: #606266;
}

.flat-type-item .count {
  color: #909399;
  font-size: 0.9rem;
}

.expiry {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  color: #606266;
  margin-bottom: 1rem;
}

.expiry .el-icon {
  margin-right: 6px;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.coords {
  font-size: 0.8rem;
  color: #a0a0a0;
}

.bus-services-wrapper {
  margin-top: 4px;
}
</style>
