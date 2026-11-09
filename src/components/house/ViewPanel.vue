<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHousePlanStore } from '@/stores/housePlan'

const emit = defineEmits<{ fit: []; zoomSel: [] }>()
const { t } = useI18n()
const store = useHousePlanStore()

// Phones: the controls sit behind a "View" button (one extra tap) instead of covering the plan; wider screens show them always.
const query = window.matchMedia('(max-width: 759px)')
const compact = ref(query.matches)
const open = ref(false)
const onQuery = (e: MediaQueryListEvent) => (compact.value = e.matches)
query.addEventListener('change', onQuery)
onBeforeUnmount(() => query.removeEventListener('change', onQuery))
</script>

<template>
  <aside class="view-panel">
    <button v-if="compact" type="button" class="bp-btn small" :aria-expanded="open" @click="open = !open">
      {{ t('house.menuGroups.view') }} {{ open ? '▾' : '▸' }}
    </button>
    <div v-if="!compact || open" class="bp-panel body">
      <div v-if="store.mode === '3d'" class="seg" role="group" :aria-label="t('house.views.label')">
        <button type="button" class="bp-btn small" :class="{ 'is-active': store.preset === '3d' }" @click="store.setPreset('3d')">{{ t('house.views.view3d') }}</button>
        <button type="button" class="bp-btn small" :class="{ 'is-active': store.preset === 'top' }" @click="store.setPreset('top')">{{ t('house.views.top') }}</button>
        <button type="button" class="bp-btn small" :class="{ 'is-active': store.preset === 'eye' }" @click="store.setPreset('eye')">{{ t('house.views.eye') }}</button>
      </div>
      <button type="button" class="bp-btn small" :title="t('house.views.fitHint')" @click="emit('fit')">{{ t('house.views.fit') }}</button>
      <button type="button" class="bp-btn small" :disabled="!store.selected" :title="t('house.views.zoomSelHint')" @click="emit('zoomSel')">{{ t('house.views.zoomSel') }}</button>
      <button type="button" class="bp-btn small" :class="{ 'is-active': store.showLabels }" :title="t('house.tools.labelsHint')" @click="store.showLabels = !store.showLabels">{{ t('house.tools.labels') }}</button>
      <button v-if="store.mode === 'arrange'" type="button" class="bp-btn small" :class="{ 'is-active': store.showClearance }" :title="t('house.tools.clearanceHint')" @click="store.showClearance = !store.showClearance">{{ t('house.tools.clearance') }}</button>
      <button v-if="store.mode === 'arrange'" type="button" class="bp-btn small" :class="{ 'is-active': store.measuring }" @click="store.toggleMeasure()">{{ t('house.tools.measure') }}</button>
      <p v-if="store.mode === '3d'" class="hint">{{ t('house.views.navHint') }}</p>
    </div>
  </aside>
</template>

<style scoped>
.view-panel {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  pointer-events: none;
}
.view-panel > * {
  pointer-events: auto;
}
.small {
  min-height: 28px;
  padding: 4px 10px;
}
.body {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 6px;
}
.seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.hint {
  margin: 4px 2px 0;
  max-width: 190px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-text-secondary);
}
@media (max-width: 759px) {
  /* phones: an expanded panel wraps into a compact grid and leaves the Rooms button (top-right) uncovered */
  .body {
    flex-direction: row;
    flex-wrap: wrap;
    max-width: calc(100vw - 120px);
    max-height: 60vh;
    overflow-y: auto;
  }
  .seg {
    display: flex;
    flex-wrap: wrap;
  }
  .hint {
    display: none;
  }
}
</style>
