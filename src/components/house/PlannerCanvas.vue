<script setup lang="ts">
import { markRaw, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { activePlan } from '@/constants/houseplan/floorplan'
import { useHousePlanStore } from '@/stores/housePlan'
import { useThemeStore } from '@/stores/theme'
import { createFurnitureLayer, type FurnitureLayer } from '@/three/house/furnitureMesh'
import { createInteraction, type Interaction } from '@/three/house/interaction'
import { createPlannerScene, type PlannerScene } from '@/three/house/scene'

const { t } = useI18n()
const store = useHousePlanStore()
const theme = useThemeStore()
const host = ref<HTMLDivElement>()

// Three.js objects stay outside Vue reactivity
let sp: PlannerScene | null = null
let furniture: FurnitureLayer | null = null
let interaction: Interaction | null = null

function syncFurniture() {
  furniture?.sync(store.items, store.selectedId, store.conflicts)
}

function syncWalls() {
  if (!sp) return
  sp.planObjs.setWalls(store.walls)
  sp.markDirty()
}

onMounted(() => {
  if (!host.value) return
  sp = markRaw(createPlannerScene(host.value, activePlan))
  furniture = markRaw(createFurnitureLayer(sp.furnitureGroup, () => sp?.markDirty()))
  interaction = markRaw(
    createInteraction(sp, furniture, {
      isArrange: () => store.mode === 'arrange',
      isMeasuring: () => store.measuring,
      itemPos: (uid) => {
        const it = store.items.find((i) => i.uid === uid)
        return it ? [it.x, it.y] : null
      },
      bounds: () => ({ w: activePlan.width, d: activePlan.depth }),
      snapPoints: () => store.snapPoints,
      onSelect: (uid) => store.select(uid),
      onDragStart: () => store.beginDrag(),
      onDrag: (uid, x, y) => store.dragTo(uid, x, y),
      onMeasure: (cm) => (store.measureCm = cm),
      wallTool: () => store.wallTool,
      wallSnapPoints: () => store.planPoints,
      onWallDraw: (a, b) => store.addWall(a, b),
      onWallErase: (i) => store.removeWall(i),
    }),
  )

  sp.setTheme(theme.isDark)
  syncWalls()
  syncFurniture()
})

onBeforeUnmount(() => {
  interaction?.dispose()
  furniture?.dispose()
  sp?.dispose()
  sp = furniture = interaction = null
})

watch(() => theme.isDark, (dark) => sp?.setTheme(dark))
watch(() => [store.items, store.selectedId, store.conflicts], syncFurniture, { deep: true })

watch(
  () => store.mode,
  (m) => {
    interaction?.clearMeasure()
    sp?.setMode(m)
  },
)
watch(() => store.walls, syncWalls, { deep: true })
watch(() => store.wallTool, () => interaction?.clearWallDraft())
watch(() => store.presetTick, () => sp?.applyPreset(store.preset))
watch(() => store.measuring, (on) => {
  if (!on) interaction?.clearMeasure()
})

defineExpose({ snapshot: () => sp?.snapshot() ?? null })
</script>

<template>
  <div ref="host" class="canvas-host" :class="{ measuring: store.measuring || !!store.wallTool }" role="img" :aria-label="t('house.canvasLabel')"></div>
</template>

<style scoped>
.canvas-host {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.canvas-host.measuring :deep(canvas) {
  cursor: crosshair;
}
</style>
