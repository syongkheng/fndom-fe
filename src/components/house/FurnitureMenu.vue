<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { activePlan } from '@/constants/houseplan/floorplan'
import type { PlacedItem } from '@/constants/houseplan/furniture'
import { useHousePlanStore } from '@/stores/housePlan'
import { planSize } from '@/utilities/houseGeometry'

const emit = defineEmits<{ locate: [] }>()
const { t } = useI18n()
const store = useHousePlanStore()
const open = ref(window.innerWidth >= 760)

const cm = (m: number) => Math.round(m * 100)
/** Width × depth × height as drawn on the plan, in cm (the same figures as the printed list). */
const sizeOf = (it: PlacedItem) => {
  const s = planSize(it)
  return `${cm(s.x)} × ${cm(s.y)} × ${cm(it.h)}`
}

function groups() {
  const out: { key: string; room: string; items: PlacedItem[] }[] = []
  for (const r of activePlan.rooms) {
    const list = store.roomContents.byRoom.get(r.id)
    if (list?.length) out.push({ key: String(r.id), room: t(r.nameKey), items: list })
  }
  if (store.roomContents.outside.length) out.push({ key: 'outside', room: t('house.legend.outside'), items: store.roomContents.outside })
  return out
}

function pick(it: PlacedItem) {
  store.select(it.uid)
  emit('locate')
}
</script>

<template>
  <aside class="fmenu">
    <div v-if="open" class="bp-panel body">
      <p v-if="!store.items.length" class="empty">{{ t('house.furnitureMenu.empty') }}</p>
      <template v-for="g in groups()" :key="g.key">
        <h4 class="bp-label">{{ g.room }}</h4>
        <ul>
          <li v-for="it in g.items" :key="it.uid">
            <button type="button" :class="{ on: it.uid === store.selectedId }" :title="t('house.furnitureMenu.locate')" @click="pick(it)">
              <span class="nm">{{ store.displayName(it.catalogId, it.name) }}</span>
              <span class="sz mono">{{ sizeOf(it) }}</span>
            </button>
          </li>
        </ul>
      </template>
      <p v-if="store.items.length" class="unit">{{ t('house.furnitureMenu.unit') }}</p>
    </div>
    <button type="button" class="bp-btn small" :aria-expanded="open" @click="open = !open">
      {{ t('house.furnitureMenu.title') }} ({{ store.items.length }}) {{ open ? '▾' : '▴' }}
    </button>
  </aside>
</template>

<style scoped>
.fmenu {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  max-width: calc(100% - 16px);
  pointer-events: none;
}
.fmenu > * {
  pointer-events: auto;
}
.small {
  min-height: 28px;
  padding: 4px 10px;
}
.body {
  width: 270px;
  max-width: 100%;
  max-height: min(50vh, 420px);
  overflow-y: auto;
  padding: 8px 10px;
  font-size: 12px;
}
.body h4 {
  margin: 8px 0 2px;
}
.body h4:first-child {
  margin-top: 0;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li button {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-heading);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
li button:hover,
li button.on {
  background: var(--color-background-mute);
}
.nm {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sz {
  flex-shrink: 0;
  color: var(--color-text-secondary);
}
.empty,
.unit {
  margin: 0;
  color: var(--color-text-tertiary);
}
.unit {
  margin-top: 8px;
}
@media (max-width: 759px) {
  .body {
    width: min(270px, calc(100vw - 16px));
    max-height: 36vh; /* leaves room for the Rooms list above */
  }
}
</style>
