<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FurnitureBuilder from '@/components/house/FurnitureBuilder.vue'
import InfoBar from '@/components/house/InfoBar.vue'
import PlannerCanvas from '@/components/house/PlannerCanvas.vue'
import RoomLegend from '@/components/house/RoomLegend.vue'
import Toolbar from '@/components/house/Toolbar.vue'
import { useHousePlanStore } from '@/stores/housePlan'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const store = useHousePlanStore()
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

function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
  if (store.builder) return // the furniture builder owns the keyboard while open
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
  if (mod || e.altKey) return

  if (key === 'Escape') {
    if (store.wallTool) store.setWallTool(null)
    else if (store.measuring) store.toggleMeasure()
    else store.select(null)
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
  } else if (key === 'r' || key === 'R') {
    e.preventDefault()
    store.rotateSelected()
  } else if (key === 'Delete' || key === 'Backspace') {
    e.preventDefault()
    store.deleteSelected()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="house-planner">
    <Toolbar @snapshot="snapshot" />
    <section class="stage">
      <PlannerCanvas ref="canvas" />
      <RoomLegend />
    </section>
    <InfoBar />
    <FurnitureBuilder v-if="store.builder" />
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
