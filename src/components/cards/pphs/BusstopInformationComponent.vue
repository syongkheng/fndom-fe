<script setup lang="ts">
import type { BusRouteInformation } from '@/interfaces/BusRouteInformation.model';
import type { BusstopInformation } from '@/interfaces/BusstopInformation.model';

const props = defineProps<{
  records: BusstopInformation[]
  busServices: Record<string, BusRouteInformation[]>
}>()
</script>

<template>
  <div v-for="value in props.records" :key="value.busstop_code" class="busstop-card">
    <div class="busstop-line">
      <span class="busstop-code">{{ value.busstop_code }}</span>
      <span class="busstop-road">{{ value.road_name }}</span>
      <span class="busstop-distance">~ {{ Number(value.distance_m).toFixed(0) }} m</span>
    </div>
    <div class="busstop-desc">{{ value.desc }}</div>
    <div v-if="props.busServices[value.busstop_code]?.length" class="bus-services-wrapper">
      <div class="bus-services-label">
        Available Bus Services: {{ props.busServices[value.busstop_code].length }}
      </div>
      <div class="bus-services-grid">
        <el-tag v-for="service in props.busServices[value.busstop_code]" :key="service.service_no" type="info"
          size="small">
          {{ service.service_no }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>
.busstop-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: var(--color-background-mute);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.busstop-card:hover {
  background-color: var(--color-background-soft);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.busstop-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 8px;
  font-weight: 500;
  color: var(--color-heading);
}

.busstop-code {
  flex-shrink: 0;
  color: var(--el-color-primary);
  font-weight: 600;
  min-width: 60px;
}

.busstop-road {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
}

.busstop-distance {
  flex-shrink: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  min-width: 70px;
  text-align: right;
}

.busstop-desc {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bus-services-label {
  font-weight: 500;
  font-size: 0.85rem;
  margin-bottom: 4px;
  color: var(--color-text-secondary);
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
