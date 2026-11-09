<script setup lang="ts">
import { markRaw, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { activePlan } from '@/constants/houseplan/floorplan'
import type { PlacedItem } from '@/constants/houseplan/furniture'
import { footprint, isQuarterTurn, planSize } from '@/utilities/houseGeometry'
import HouseContextMenu from './HouseContextMenu.vue'
import { useHousePlanStore } from '@/stores/housePlan'
import { useThemeStore } from '@/stores/theme'
import { createFurnitureLayer, type FurnitureLayer, type PieceLabel } from '@/three/house/furnitureMesh'
import { createInteraction, type Interaction } from '@/three/house/interaction'
import { createPlannerScene, type PlannerScene } from '@/three/house/scene'

const { t, locale } = useI18n()
const store = useHousePlanStore()
const theme = useThemeStore()
const host = ref<HTMLDivElement>()
const menu = ref<{ x: number; y: number; uid: string | null; at: [number, number] | null } | null>(null)

// Three.js objects stay outside Vue reactivity
let sp: PlannerScene | null = null
let furniture: FurnitureLayer | null = null
let interaction: Interaction | null = null

/** Quiet by default: names only, on pieces big enough to hold them; the selected piece also shows its size. */
function labelOf(item: PlacedItem): PieceLabel | null {
  const name = store.displayName(item.catalogId, item.name)
  if (item.uid === store.selectedId) {
    const sz = planSize(item)
    const cm = (m: number) => Math.round(m * 100)
    return { name: item.locked ? `${name} · ${t('house.info.locked')}` : name, selected: true, size: `${cm(sz.x)} × ${cm(sz.y)} × ${cm(item.h)} cm${item.rot ? ` · ${Math.round(item.rot * 10) / 10}°` : ''}` }
  }
  return store.showLabels && Math.max(item.w, item.d) >= 0.9 ? { name } : null
}

function syncFurniture() {
  furniture?.sync(store.items, store.selectedId, store.conflicts, labelOf, new Set(store.clearance.keys()))
  interaction?.syncHandles()
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
      onContext: (uid, x, y, at) => {
        if (uid) store.select(uid)
        menu.value = { x, y, uid, at }
      },
      isLocked: (uid) => !!store.items.find((i) => i.uid === uid)?.locked,
      onEdit: (uid) => {
        store.select(uid)
        store.openBuilder(true)
      },
      onDragStart: () => store.beginDrag(),
      onDrag: (uid, x, y) => store.dragTo(uid, x, y),
      snapDrag: (uid, x, y) => store.snapDrag(uid, x, y),
      resizable: () => {
        const it = store.selected
        if (!it || it.locked || store.mode !== 'arrange' || store.measuring || store.wallTool) return null
        return { uid: it.uid, rect: footprint(it), quarter: isQuarterTurn(it.rot) }
      },
      onResizeStart: (uid) => store.beginResize(uid),
      guidesFor: (uid) => store.guidesFor(uid),
      onRotateStart: () => store.beginRotate(),
      onRotateTo: (uid, deg, shift, alt) => store.rotateTo(uid, deg, shift, alt),
      onRotateTap: () => store.rotateSelected(),
      onResize: (uid, ax, ay, cx, cy, snap) => store.resizeTo(uid, ax, ay, cx, cy, snap),
      onMeasure: (cm) => (store.measureCm = cm),
      wallTool: () => store.wallTool,
      wallSnapPoints: () => store.planPoints,
      onWallDraw: (a, b) => store.addWall(a, b),
      onWallErase: (i) => store.removeWall(i),
    }),
  )

  sp.setTheme(theme.isDark)
  // The scene starts in the plan view; match a store that is already in 3D (e.g. the shared-house page).
  if (store.mode !== 'arrange') {
    sp.setMode(store.mode)
    sp.applyPreset(store.preset)
  }
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
watch(() => [store.items, store.selectedId, store.conflicts, store.showLabels, store.clearance, locale.value, store.mode, store.measuring, store.wallTool], syncFurniture, { deep: true })

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

defineExpose({
  snapshot: () => sp?.snapshot() ?? null,
  cursor: () => interaction?.cursor() ?? null,
  fitPlan: () => sp?.fitPlan(),
  /** Zooms to the selected piece, or frames the whole plan when nothing is selected. */
  zoomToSelection: () => (store.selected ? sp?.zoomToRect(footprint(store.selected)) : sp?.fitPlan()),
})
</script>

<template>
  <div ref="host" class="canvas-host" :class="{ measuring: store.measuring || !!store.wallTool }" role="img" :aria-label="t('house.canvasLabel')"></div>
  <HouseContextMenu v-if="menu" :menu="menu" @close="menu = null" />
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
