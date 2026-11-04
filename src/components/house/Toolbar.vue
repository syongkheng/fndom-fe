<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHousePlanStore } from '@/stores/housePlan'
import { useToast } from '@/composables/useToast'
import FurniturePicker from './FurniturePicker.vue'

const { t } = useI18n()
const store = useHousePlanStore()
const toast = useToast()
const emit = defineEmits<{ snapshot: [] }>()

const moreOpen = ref(false)
const confirmClear = ref(false)
const fileInput = ref<HTMLInputElement>()

let clearTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(clearTimer))

function askClear() {
  confirmClear.value = true
  clearTimer = setTimeout(() => (confirmClear.value = false), 4000)
}
function doClear() {
  clearTimeout(clearTimer)
  confirmClear.value = false
  store.clearAll()
}

function exportJson() {
  const url = URL.createObjectURL(new Blob([store.exportJson()], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'awense-house-layout.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function onImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    store.importJson(await file.text())
  } catch {
    toast.error(t('house.toast.importReadFailed'))
  }
}
</script>

<template>
  <header class="toolbar">
    <div class="row">
      <div class="grp" role="group" :aria-label="t('house.modes.label')">
        <button type="button" class="bp-btn" :class="{ 'is-active': store.mode === 'arrange' }" @click="store.setMode('arrange')">{{ t('house.modes.arrange') }}</button>
        <button type="button" class="bp-btn" :class="{ 'is-active': store.mode === '3d' }" @click="store.setMode('3d')">{{ t('house.modes.view3d') }}</button>
      </div>

      <FurniturePicker />

      <div class="grp">
        <button type="button" class="bp-btn" :disabled="!store.selected" :title="t('house.actions.rotateHint')" @click="store.rotateSelected()">{{ t('house.actions.rotate') }}</button>
        <button type="button" class="bp-btn" :disabled="!store.selected" @click="store.duplicateSelected()">{{ t('house.actions.duplicate') }}</button>
        <button type="button" class="bp-btn" :disabled="!store.selected" :title="t('house.actions.deleteHint')" @click="store.deleteSelected()">{{ t('house.actions.delete') }}</button>
      </div>

      <div class="grp">
        <button type="button" class="bp-btn" :disabled="!store.canUndo" :title="t('house.actions.undoHint')" :aria-label="t('house.actions.undo')" @click="store.undo()">↶</button>
        <button type="button" class="bp-btn" :disabled="!store.canRedo" :title="t('house.actions.redoHint')" :aria-label="t('house.actions.redo')" @click="store.redo()">↷</button>
      </div>

      <button type="button" class="bp-btn more-toggle" :aria-expanded="moreOpen" @click="moreOpen = !moreOpen">
        {{ t('house.actions.more') }} {{ moreOpen ? '▴' : '▾' }}
      </button>
    </div>

    <div class="row more" :class="{ open: moreOpen }">
      <div class="grp" role="group" :aria-label="t('house.views.label')">
        <button type="button" class="bp-btn" :class="{ 'is-active': store.mode === '3d' && store.preset === '3d' }" @click="store.setPreset('3d')">{{ t('house.views.view3d') }}</button>
        <button type="button" class="bp-btn" :class="{ 'is-active': store.mode === '3d' && store.preset === 'top' }" @click="store.setPreset('top')">{{ t('house.views.top') }}</button>
        <button type="button" class="bp-btn" :class="{ 'is-active': store.mode === '3d' && store.preset === 'eye' }" @click="store.setPreset('eye')">{{ t('house.views.eye') }}</button>
      </div>

      <button type="button" class="bp-btn" :class="{ 'is-active': store.measuring }" :disabled="store.mode !== 'arrange'" @click="store.toggleMeasure()">{{ t('house.tools.measure') }}</button>
      <button type="button" class="bp-btn" :class="{ 'is-active': !!store.wallTool }" @click="store.toggleWallEdit()">{{ t('house.tools.walls') }}</button>
      <button type="button" class="bp-btn" @click="store.openBuilder(false)">{{ t('house.tools.custom') }}</button>
      <button type="button" class="bp-btn" :disabled="!store.selected" :title="t('house.tools.editShapeHint')" @click="store.openBuilder(true)">{{ t('house.tools.editShape') }}</button>

      <button v-if="!confirmClear" type="button" class="bp-btn" :disabled="!store.items.length" @click="askClear()">{{ t('house.actions.clearAll') }}</button>
      <span v-else class="grp">
        <button type="button" class="bp-btn danger" @click="doClear()">{{ t('house.actions.confirmClear') }}</button>
        <button type="button" class="bp-btn" @click="confirmClear = false">{{ t('house.actions.cancel') }}</button>
      </span>

      <div class="grp">
        <button type="button" class="bp-btn" @click="exportJson()">{{ t('house.tools.exportJson') }}</button>
        <button type="button" class="bp-btn" @click="fileInput?.click()">{{ t('house.tools.importJson') }}</button>
        <button type="button" class="bp-btn" @click="emit('snapshot')">{{ t('house.tools.png') }}</button>
      </div>
      <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onImport" />
    </div>

    <div v-if="store.wallTool" class="row walls" role="group" :aria-label="t('house.walls.label')">
      <div class="grp">
        <button type="button" class="bp-btn" :class="{ 'is-active': store.wallTool === 'draw' }" @click="store.setWallTool('draw')">{{ t('house.walls.draw') }}</button>
        <button type="button" class="bp-btn" :class="{ 'is-active': store.wallTool === 'erase' }" @click="store.setWallTool('erase')">{{ t('house.walls.erase') }}</button>
      </div>
      <div v-if="store.wallTool === 'draw'" class="grp" role="group" :aria-label="t('house.walls.kind')">
        <button type="button" class="bp-btn" :class="{ 'is-active': store.wallKind === 'wall' }" @click="store.wallKind = 'wall'">{{ t('house.walls.kindWall') }}</button>
        <button type="button" class="bp-btn" :class="{ 'is-active': store.wallKind === 'door' }" @click="store.wallKind = 'door'">{{ t('house.walls.kindDoor') }}</button>
        <button type="button" class="bp-btn" :class="{ 'is-active': store.wallKind === 'parapet' }" @click="store.wallKind = 'parapet'">{{ t('house.walls.kindParapet') }}</button>
      </div>
      <button type="button" class="bp-btn" :disabled="!store.wallsEdited" @click="store.resetWalls()">{{ t('house.walls.reset') }}</button>
      <button type="button" class="bp-btn" @click="store.setWallTool(null)">{{ t('house.walls.done') }}</button>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
}
.grp {
  display: inline-flex;
  gap: 4px;
}
.danger {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: var(--color-background);
}
.more {
  display: none;
}
.more.open {
  display: flex;
}
.more-toggle {
  margin-left: auto;
}
@media (min-width: 900px) {
  .more {
    display: flex;
  }
  .more-toggle {
    display: none;
  }
}
</style>
