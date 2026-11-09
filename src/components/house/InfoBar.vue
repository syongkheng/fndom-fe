<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHousePlanStore } from '@/stores/housePlan'
import { planSize } from '@/utilities/houseGeometry'

const { t } = useI18n()
const store = useHousePlanStore()
const cm = (m: number) => Math.round(m * 100)

/** Width / depth as drawn on the plan (east-west, north-south), so a turned piece reads the way it looks. */
const sizes = computed(() => {
  const it = store.selected
  if (!it) return null
  const sz = planSize(it)
  return { x: cm(sz.x), y: cm(sz.y), h: cm(it.h) }
})

function setSize(axis: 'x' | 'y' | 'h', e: Event) {
  const el = e.target as HTMLInputElement
  const v = Number(el.value)
  if (!Number.isFinite(v) || v <= 0) {
    el.value = String(sizes.value?.[axis] ?? '') // put the old value back
    return
  }
  store.setSelectedSize(axis, v / 100)
}
function setRotation(e: Event) {
  const el = e.target as HTMLInputElement
  const v = Number(el.value)
  if (el.value.trim() === '' || !Number.isFinite(v)) el.value = String(store.selected?.rot ?? '')
  else store.setSelectedRotation(v)
}
const emit = defineEmits<{ locate: [] }>()

/** Selects the next piece with a warning (overlap first, then clearance) and asks the view to zoom to it. */
function locate(ids: Set<string> | Map<string, unknown>) {
  const list = [...ids.keys()]
  if (!list.length) return
  const at = list.indexOf(store.selectedId ?? '')
  store.select(list[(at + 1) % list.length])
  emit('locate')
}
const clashing = computed(() => !!store.selected && store.conflicts.has(store.selected.uid))
const issues = computed(() => (store.selected ? store.clearance.get(store.selected.uid) ?? [] : []))
</script>

<template>
  <footer class="info" role="status">
    <template v-if="store.selected">
      <strong>{{ store.displayName(store.selected.catalogId, store.selected.name) }}</strong>
      <span v-if="sizes" class="size mono" role="group" :aria-label="t('house.info.size')">
        <label>{{ t('house.info.w') }} <input type="number" min="10" max="2000" step="5" :value="sizes.x" :disabled="!!store.selected.locked" @change="setSize('x', $event)" /></label>
        <label>{{ t('house.info.d') }} <input type="number" min="10" max="2000" step="5" :value="sizes.y" :disabled="!!store.selected.locked" @change="setSize('y', $event)" /></label>
        <label>{{ t('house.info.h') }} <input type="number" min="10" max="2000" step="5" :value="sizes.h" :disabled="!!store.selected.locked" @change="setSize('h', $event)" /></label>
        cm
      </span>
      <label class="muted mono rot">{{ t('house.info.rotLabel') }} <input type="number" min="0" max="360" step="1" :value="store.selected.rot" :disabled="!!store.selected.locked" @change="setRotation($event)" />°</label>
      <span v-if="clashing" class="warn">{{ t('house.info.overlap') }}</span>
      <span v-for="i in issues" :key="i" class="caution">{{ t(`house.info.clearance.${i}`) }}</span>
    </template>
    <span v-else class="muted hint">
      {{ store.wallTool === 'draw' ? t('house.info.hintWallDraw') : store.wallTool === 'erase' ? t('house.info.hintWallErase') : store.measuring ? t('house.info.hintMeasure') : t('house.info.hintSelect') }}
    </span>
    <span v-if="store.measureCm !== null" class="measure mono">{{ t('house.info.distance', { cm: store.measureCm }) }}</span>
    <button v-if="store.conflicts.size" type="button" class="warn jump" :title="t('house.info.locateHint')" @click="locate(store.conflicts)">{{ t('house.info.overlapCount', { n: store.conflicts.size }) }}</button>
    <button v-if="store.clearance.size" type="button" class="caution jump" :title="t('house.info.locateHint')" @click="locate(store.clearance)">{{ t('house.info.clearanceCount', { n: store.clearance.size }) }}</button>
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
.size {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.rot {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.rot input,
.size input {
  width: 58px;
  padding: 2px 4px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-heading);
  font: inherit;
}
.rot input:disabled,
.size input:disabled {
  opacity: 0.5;
}
.jump {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  text-decoration: underline dotted;
  text-underline-offset: 3px;
  cursor: pointer;
}
.caution {
  color: var(--el-color-warning-dark-2, #b26a00);
  font-weight: 600;
}
.measure {
  color: var(--color-accent);
  font-weight: 700;
}
@media (max-width: 559px) {
  .info {
    padding: 6px 10px;
    min-height: 0;
  }
  .hint {
    flex: 1 1 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap; /* one line: the full tip is in the ? sheet */
  }
}
</style>
