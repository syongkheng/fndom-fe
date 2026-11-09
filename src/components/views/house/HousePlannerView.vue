<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FurnitureBuilder from '@/components/house/FurnitureBuilder.vue'
import LayoutsDialog from '@/components/house/LayoutsDialog.vue'
import InfoBar from '@/components/house/InfoBar.vue'
import PlannerCanvas from '@/components/house/PlannerCanvas.vue'
import RoomLegend from '@/components/house/RoomLegend.vue'
import FurnitureMenu from '@/components/house/FurnitureMenu.vue'
import ShareDialog from '@/components/house/ShareDialog.vue'
import ViewPanel from '@/components/house/ViewPanel.vue'
import PlannerHints from '@/components/house/PlannerHints.vue'
import ShortcutsDialog from '@/components/house/ShortcutsDialog.vue'
import { activePlan } from '@/constants/houseplan/floorplan'
import { planSize } from '@/utilities/houseGeometry'
import { printPlan, type PrintGroup } from '@/utilities/housePrint'
import Toolbar from '@/components/house/Toolbar.vue'
import { useHousePlanStore } from '@/stores/housePlan'
import { useHouseLayoutsStore } from '@/stores/houseLayouts'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const store = useHousePlanStore()
const layouts = useHouseLayoutsStore()
const toast = useToast()
const canvas = ref<InstanceType<typeof PlannerCanvas>>()

function snapshot() {
  const url = canvas.value?.snapshot()
  if (!url) {
    toast.error(t('house.toast.captureFailed'))
    return
  }
  const a = document.createElement('a')
  a.href = url
  a.download = 'awense-house-plan.png'
  a.click()
}

/** Print / save as PDF: the picture as currently shown, plus what is in each room. */
function print() {
  const url = canvas.value?.snapshot()
  if (!url) {
    toast.error(t('house.toast.captureFailed'))
    return
  }
  const cm = (m: number) => Math.round(m * 100)
  const fmt = (it: (typeof store.items)[number]) => {
    const sz = planSize(it)
    return { name: store.displayName(it.catalogId, it.name), size: `${cm(sz.x)} × ${cm(sz.y)} × ${cm(it.h)} cm` }
  }
  const groups: PrintGroup[] = []
  for (const r of activePlan.rooms) {
    const list = store.roomContents.byRoom.get(r.id)
    if (list?.length) groups.push({ room: t(r.nameKey), items: list.map(fmt) })
  }
  if (store.roomContents.outside.length) groups.push({ room: t('house.legend.outside'), items: store.roomContents.outside.map(fmt) })
  printPlan({
    title: layouts.layouts.find((l) => l.id === layouts.currentId)?.name ?? t('house.print.title'),
    subtitle: `${new Date().toLocaleDateString()} · ${activePlan.name}`,
    imageUrl: url,
    groups,
    labels: { furniture: t('house.print.furniture'), total: t('house.print.total'), footer: t('house.print.footer') },
  })
}

// Leaving with edits that have not reached the saved layout (autosave off, still pending, or failed) asks first.
const unsaved = computed(() => layouts.status === 'unsaved' || layouts.status === 'saving' || layouts.status === 'error')
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!unsaved.value) return
  e.preventDefault()
  e.returnValue = ''
}

function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
  if (store.builder || layouts.dialogOpen || store.helpOpen) return // the furniture builder / dialogs own the keyboard while open
  const mod = e.ctrlKey || e.metaKey
  const key = e.key

  if (mod && key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) store.redo()
    else store.undo()
    return
  }
  if (mod && key.toLowerCase() === 'y') {
    e.preventDefault()
    store.redo()
    return
  }
  // Copy / cut / paste only take over the keys when there is something to act on, so normal text copy still works.
  if (mod && key.toLowerCase() === 'c' && store.selected) {
    e.preventDefault()
    store.copySelected()
    return
  }
  if (mod && key.toLowerCase() === 'x' && store.selected) {
    e.preventDefault()
    store.cutSelected()
    return
  }
  if (mod && key.toLowerCase() === 'v' && store.clipboard) {
    e.preventDefault()
    store.paste(canvas.value?.cursor() ?? null)
    return
  }
  if (mod && key.toLowerCase() === 'd') {
    e.preventDefault() // browsers bookmark on Ctrl/Cmd+D
    if (store.selected) store.duplicateSelected()
    return
  }
  if (mod || e.altKey) return

  if (key === 'Escape') {
    if (store.wallTool) store.setWallTool(null)
    else if (store.measuring) store.toggleMeasure()
    else store.select(null)
    return
  }
  if (key === '?') {
    e.preventDefault()
    store.helpOpen = true
    return
  }
  if (key === 'f' || key === 'F') {
    e.preventDefault()
    canvas.value?.zoomToSelection()
    return
  }
  if (!store.selected) return

  const step = e.shiftKey ? 0.01 : 0.05
  const arrows: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
  }
  if (arrows[key]) {
    e.preventDefault()
    store.nudgeSelected(...arrows[key])
  } else if (key === 'Enter') {
    if (el?.tagName === 'BUTTON') return // Enter activates a focused button
    e.preventDefault()
    store.openBuilder(true)
  } else if (key === 'r' || key === 'R') {
    e.preventDefault()
    store.rotateSelected()
  } else if (key === '[' || key === ']') {
    e.preventDefault()
    store.rotateBy(key === '[' ? -15 : 15)
  } else if (key === 'Delete' || key === 'Backspace') {
    e.preventDefault()
    store.deleteSelected()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeunload', onBeforeUnload)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<template>
  <div class="house-planner">
    <Toolbar @snapshot="snapshot" @print="print" />
    <section class="stage">
      <PlannerCanvas ref="canvas" />
      <ViewPanel @fit="canvas?.fitPlan()" @zoom-sel="canvas?.zoomToSelection()" />
      <RoomLegend />
      <FurnitureMenu @locate="canvas?.zoomToSelection()" />
      <PlannerHints />
    </section>
    <InfoBar @locate="canvas?.zoomToSelection()" />
    <FurnitureBuilder v-if="store.builder" />
    <LayoutsDialog />
    <ShareDialog />
    <ShortcutsDialog />
  </div>
</template>

<style scoped>
.house-planner {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* viewport minus the 64px sticky header and the phone tab bar; the footer is hidden on this route */
  height: calc(100dvh - 64px - var(--tabbar-h));
  min-height: 0;
  background: var(--color-background);
}
.stage {
  position: relative;
  flex: 1;
  min-height: 0;
}
</style>
