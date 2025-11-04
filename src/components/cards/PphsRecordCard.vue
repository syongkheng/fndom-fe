<script setup lang="ts">
import { ApiRoute } from '@/constants/ApiRoute';
import HttpClient from '@/interceptors/HttpClient';
import type { BusstopInformation } from '@/interfaces/BusstopInformation.model';
import type { PphsRecord } from '@/interfaces/PphsRecord.model';
import { Location, Timer, Link } from '@element-plus/icons-vue'
import { computed, ref } from 'vue';

const proximityInMeters = ref<number>(0);
const busstopRecords = ref<BusstopInformation[]>([])

const props = defineProps<{
  record: PphsRecord
}>()

const remapSourceLabel = {
  "database": "Marked",
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
      return res.data.data as BusstopInformation[]
    })

    busstopRecords.value = response

  } catch (error) {
    console.error("Something went wrong.", error)
  }

}

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
        {{ remapSourceLabel[record.source] }}
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
            Busstops within <strong>{{ formattedProximity }}</strong> : <strong>{{ busstopRecords.length }}</strong>
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
        </div>
        <div v-else>
          Something went wrong retrieving coordinates, unable to show more information.
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<style scoped>
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
</style>
