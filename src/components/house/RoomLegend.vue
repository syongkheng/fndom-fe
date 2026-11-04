<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { activePlan } from '@/constants/houseplan/floorplan'

const { t } = useI18n()
const open = ref(window.innerWidth >= 760)
</script>

<template>
  <aside class="legend">
    <button type="button" class="bp-btn small" :aria-expanded="open" @click="open = !open">
      {{ t('house.legend.rooms') }} {{ open ? '▾' : '▸' }}
    </button>
    <ol v-if="open" class="bp-panel title-block">
      <li v-for="r in activePlan.rooms" :key="r.id">
        <span class="room-marker static">{{ r.id }}</span>{{ t(r.nameKey) }}
      </li>
    </ol>
  </aside>
</template>

<style scoped>
.legend {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  pointer-events: none;
}
.legend > * {
  pointer-events: auto;
}
.small {
  min-height: 28px;
  padding: 4px 10px;
}
/* title-block styling: ruled rows like a drawing's legend table */
.title-block {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 12px;
  max-height: 60vh;
  overflow: auto;
}
li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  white-space: nowrap;
}
li + li {
  border-top: 1px solid var(--color-divider);
}
</style>
