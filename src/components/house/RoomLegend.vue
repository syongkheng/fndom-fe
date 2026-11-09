<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { activePlan } from '@/constants/houseplan/floorplan'
import { useHousePlanStore } from '@/stores/housePlan'

const { t } = useI18n()
const store = useHousePlanStore()
const open = ref(window.innerWidth >= 760)

const inRoom = (id: number) => store.roomContents.byRoom.get(id) ?? []
/** Hover text: what is in the room. */
const contents = (id: number) => inRoom(id).map((i) => store.displayName(i.catalogId, i.name)).join(', ')
</script>

<template>
  <aside class="legend">
    <button type="button" class="bp-btn small" :aria-expanded="open" @click="open = !open">
      {{ t('house.legend.rooms') }} {{ open ? '▾' : '▸' }}
    </button>
    <ol v-if="open" class="bp-panel title-block">
      <li v-for="r in activePlan.rooms" :key="r.id">
        <span class="room-marker static">{{ r.id }}</span>{{ t(r.nameKey) }}
        <span v-if="inRoom(r.id).length" class="count" :title="contents(r.id)">{{ inRoom(r.id).length }}</span>
      </li>
      <li v-if="store.roomContents.outside.length" class="outside">
        {{ t('house.legend.outside') }}
        <span class="count" :title="store.roomContents.outside.map((i) => store.displayName(i.catalogId, i.name)).join(', ')">{{ store.roomContents.outside.length }}</span>
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
.count {
  margin-left: auto;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  font: 700 11px/18px var(--font-sans);
}
.outside {
  color: var(--color-text-tertiary);
}
li + li {
  border-top: 1px solid var(--color-divider);
}
@media (max-width: 759px) {
  .legend {
    max-width: calc(100% - 16px);
  }
  .title-block {
    max-height: 40vh;
  }
}
</style>
