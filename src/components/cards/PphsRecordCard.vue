<script setup lang="ts">
import { ApiRoute } from '@/constants/ApiRoute';
import HttpClient from '@/interceptors/HttpClient';
import type { BusRouteInformation } from '@/interfaces/BusRouteInformation.model';
import type { BusstopInformation } from '@/interfaces/BusstopInformation.model';
import type { PphsRecord } from '@/interfaces/PphsRecord.model';
import { Location, Timer, Link } from '@element-plus/icons-vue'
import { computed, ref } from 'vue';

const proximityInMeters = ref<number>(0);
const busstopRecords = ref<BusstopInformation[]>([])
const busServicesByBusstop = ref<Record<string, BusRouteInformation[]>>({});
const busstopCounts = ref<number>(0);

const props = defineProps<{
  record: PphsRecord
}>()

const remapSourceLabel = {
  "database": "Marked",
  "website": "Marked",
  "error": "Not on Map"
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
    console.log(">> ", busServicesByBusstop.value["06049"])

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

const openFormedUrl = () => {
  window.open(props.record.formedUrl, '_blank')
}
</script>

<template>
  <el-card shadow="hover" class="pphs-card">
    <!-- Header: Town and Source -->
    <div class="card-header">
      <div class="town">{{ record.town }}</div>
      <el-tag :type="record.source === 'database' ? 'primary' : 'danger'" size="small">
        {{ remapSourceLabel[record.source] ?? "Unknown" }}
      </el-tag>
    </div>

    <!-- Address -->
    <div class="address">
      <div>
        <el-icon>
          <Location />
        </el-icon>
        <span>{{ record.address }}</span>
      </div>
      <el-button type="primary" size="small" :icon="Link" @click="openFormedUrl">
        Map
      </el-button>
    </div>

    <!-- Flat Type Information -->
    <div class="flat-type-grid">
      <div v-for="(count, type) in record.flatType" :key="type" class="flat-type-item">
        <div class="type">{{ type }}</div>
        <div class="count">{{ count }}</div>
      </div>
    </div>

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
          <div v-for="value in busstopRecords" :key="value.busstop_code" class="busstop-card">
            <div class="busstop-line">
              <span class="busstop-code">{{ value.busstop_code }}</span>
              <span class="busstop-road">{{ value.road_name }}</span>
              <span class="busstop-distance">~ {{ Number(value.distance_m).toFixed(0) }} m</span>
            </div>
            <div class="busstop-desc">{{ value.desc }}</div>
            <div v-if="busServicesByBusstop[value.busstop_code]?.length" class="bus-services-wrapper">
              <div class="bus-services-label">
                Available Bus Services: {{ busServicesByBusstop[value.busstop_code].length }}
              </div>
              <div class="bus-services-grid">
                <el-tag v-for="service in busServicesByBusstop[value.busstop_code]" :key="service.service_no"
                  type="info" size="small">
                  {{ service.service_no }}
                </el-tag>
              </div>
            </div>
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
.busstop-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: #fafafa;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.busstop-card:hover {
  background-color: #f0f6ff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.busstop-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 8px;
  font-weight: 500;
  color: #303133;
}

.busstop-code {
  flex-shrink: 0;
  color: #409EFF;
  font-weight: 600;
  min-width: 60px;
}

.busstop-road {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
}

.busstop-distance {
  flex-shrink: 0;
  font-size: 0.9rem;
  color: #606266;
  min-width: 70px;
  text-align: right;
}

.busstop-desc {
  font-size: 0.85rem;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.bus-services-label {
  font-weight: 500;
  font-size: 0.85rem;
  margin-bottom: 4px;
  color: #606266;
}

.bus-services-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
}

@media (max-width: 768px) {
  .bus-services-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
