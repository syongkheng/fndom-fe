<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHousePlanStore } from '@/stores/housePlan'

const { t } = useI18n()
const store = useHousePlanStore()
const cm = (m: number) => Math.round(m * 100)

const dims = computed(() => {
  const it = store.selected
  if (!it) return ''
  const swap = it.rot % 180 !== 0
  return `${cm(swap ? it.d : it.w)} × ${cm(swap ? it.w : it.d)} × ${cm(it.h)} cm`
})
const clashing = computed(() => !!store.selected && store.conflicts.has(store.selected.uid))
</script>

<template>
  <footer class="info" role="status">
    <template v-if="store.selected">
      <strong>{{ store.displayName(store.selected.catalogId, store.selected.name) }}</strong>
      <span class="mono">{{ dims }} {{ t('house.info.dims') }}</span>
      <span class="muted mono">{{ t('house.info.rotation', { deg: store.selected.rot }) }}</span>
      <span v-if="clashing" class="warn">{{ t('house.info.overlap') }}</span>
    </template>
    <span v-else class="muted">
      {{ store.wallTool === 'draw' ? t('house.info.hintWallDraw') : store.wallTool === 'erase' ? t('house.info.hintWallErase') : store.measuring ? t('house.info.hintMeasure') : t('house.info.hintSelect') }}
    </span>
    <span v-if="store.measureCm !== null" class="measure mono">{{ t('house.info.distance', { cm: store.measureCm }) }}</span>
    <span v-if="store.conflicts.size" class="warn">{{ t('house.info.overlapCount', { n: store.conflicts.size }) }}</span>
  </footer>
</template>

<style scoped>
.info {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
  padding: 8px 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-background-soft);
  font-size: 13px;
  min-height: 36px;
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.muted {
  color: var(--color-text-tertiary);
}
.warn {
  color: var(--color-danger);
  font-weight: 600;
}
.measure {
  color: var(--color-accent);
  font-weight: 700;
}
</style>
