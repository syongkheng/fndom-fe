<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHousePlanStore } from '@/stores/housePlan'
import { useHouseLayoutsStore } from '@/stores/houseLayouts'
import { useHouseSharesStore } from '@/stores/houseShares'
import { useToast } from '@/composables/useToast'
import FurniturePicker from './FurniturePicker.vue'

const { t } = useI18n()
const store = useHousePlanStore()
const layouts = useHouseLayoutsStore()
const shares = useHouseSharesStore()
const toast = useToast()
const emit = defineEmits<{ snapshot: []; print: [] }>()

const moreOpen = ref(false)
const menuEl = ref<HTMLElement>()

// The "More" panel closes on a press outside it or Escape.
function onDocPointer(e: PointerEvent) {
  if (moreOpen.value && !menuEl.value?.contains(e.target as Node)) moreOpen.value = false
}
function onDocKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && moreOpen.value) {
    e.stopPropagation()
    moreOpen.value = false
  }
}
onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
  document.addEventListener('keydown', onDocKey, true)
})
const confirmClear = ref(false)
const fileInput = ref<HTMLInputElement>()

const confirmSample = ref(false)

let clearTimer: ReturnType<typeof setTimeout> | undefined
let sampleTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onDocKey, true)
  clearTimeout(clearTimer)
  clearTimeout(sampleTimer)
})

function askClear() {
  confirmClear.value = true
  clearTimer = setTimeout(() => (confirmClear.value = false), 4000)
}
function doClear() {
  clearTimeout(clearTimer)
  confirmClear.value = false
  store.clearAll()
}

function askSample() {
  if (!store.items.length) return doSample()
  confirmSample.value = true
  sampleTimer = setTimeout(() => (confirmSample.value = false), 4000)
}
function doSample() {
  clearTimeout(sampleTimer)
  confirmSample.value = false
  layouts.detach() // the sample is a new draft, not an edit of the saved layout that was open
  store.loadSample()
}

/** Runs a panel action and closes the panel. */
function pick(fn: () => void) {
  moreOpen.value = false
  fn()
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
    if (store.importJson(await file.text())) layouts.detach() // an imported file is a new draft
  } catch {
    toast.error(t('house.toast.importReadFailed'))
  }
}
</script>

<template>
  <header class="toolbar">
    <div class="row">
      <div class="grp mode" role="group" :aria-label="t('house.modes.label')">
        <button type="button" class="bp-btn" :class="{ 'is-active': store.mode === 'arrange' }" :aria-pressed="store.mode === 'arrange'" @click="store.setMode('arrange')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 4.5l6 6-2.2 2.2-1.3-1.3-5.8 5.8-2.1-2.1 5.8-5.8-1.3-1.3z" /><path d="M10 14.5L4.5 20" /></svg>
          <span class="lbl">{{ t('house.modes.arrange') }}</span>
        </button>
        <button type="button" class="bp-btn" :class="{ 'is-active': store.mode === '3d' }" :aria-pressed="store.mode === '3d'" @click="store.setMode('3d')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          <span class="lbl">{{ t('house.modes.viewShort') }}</span>
        </button>
      </div>

      <FurniturePicker />

      <div v-if="store.selected" class="grp">
        <button type="button" class="bp-btn" :title="t('house.actions.rotateHint')" @click="store.rotateSelected()">{{ t('house.actions.rotate') }}</button>
        <button type="button" class="bp-btn" @click="store.duplicateSelected()">{{ t('house.actions.duplicate') }}</button>
        <button type="button" class="bp-btn" :title="t('house.actions.deleteHint')" @click="store.deleteSelected()">{{ t('house.actions.delete') }}</button>
      </div>

      <div class="grp">
        <button type="button" class="bp-btn" :disabled="!store.canUndo" :title="t('house.actions.undoHint')" :aria-label="t('house.actions.undo')" @click="store.undo()">↶</button>
        <button type="button" class="bp-btn" :disabled="!store.canRedo" :title="t('house.actions.redoHint')" :aria-label="t('house.actions.redo')" @click="store.redo()">↷</button>
      </div>

      <div class="end">
        <button
          v-if="layouts.status !== 'local'"
          type="button"
          class="bp-btn save-chip"
          :class="`is-${layouts.status}`"
          :disabled="layouts.status === 'saved' || layouts.status === 'saving'"
          :title="t('house.layouts.statusHint')"
          @click="layouts.updateCurrent()"
        >
          {{ t(`house.layouts.status.${layouts.status}`) }}
        </button>
        <button type="button" class="bp-btn desk-only" @click="layouts.dialogOpen = true">{{ t('house.layouts.button') }}</button>
        <button type="button" class="bp-btn desk-only" :title="t('house.share.hint')" @click="shares.dialogOpen = true">{{ t('house.share.button') }}</button>

        <div ref="menuEl" class="more-wrap">
          <button type="button" class="bp-btn" :class="{ 'is-active': moreOpen }" aria-haspopup="true" :aria-expanded="moreOpen" @click="moreOpen = !moreOpen">
            {{ t('house.actions.more') }} {{ moreOpen ? '▴' : '▾' }}
          </button>

          <div v-if="moreOpen" class="panel" role="menu">
            <section>
              <h4 class="bp-label">{{ t('house.menuGroups.tools') }}</h4>
              <div class="grp">
                <button type="button" class="bp-btn" :class="{ 'is-active': !!store.wallTool }" @click="pick(() => store.toggleWallEdit())">{{ t('house.tools.walls') }}</button>
              </div>
              <div class="grp">
                <button type="button" class="bp-btn" @click="pick(() => store.openBuilder(false))">{{ t('house.tools.custom') }}</button>
                <button type="button" class="bp-btn" :disabled="!store.selected" :title="t('house.tools.editShapeHint')" @click="pick(() => store.openBuilder(true))">{{ t('house.tools.editShape') }}</button>
              </div>
            </section>

            <section>
              <h4 class="bp-label">{{ t('house.menuGroups.plan') }}</h4>
              <div class="grp phone-only">
                <button type="button" class="bp-btn" @click="pick(() => (layouts.dialogOpen = true))">{{ t('house.layouts.button') }}</button>
                <button type="button" class="bp-btn" @click="pick(() => (shares.dialogOpen = true))">{{ t('house.share.button') }}</button>
              </div>
              <div class="grp">
                <button v-if="!confirmSample" type="button" class="bp-btn" @click="askSample()">{{ t('house.tools.samplePlan') }}</button>
                <span v-else class="grp">
                  <button type="button" class="bp-btn danger" @click="pick(doSample)">{{ t('house.actions.confirmSample') }}</button>
                  <button type="button" class="bp-btn" @click="confirmSample = false">{{ t('house.actions.cancel') }}</button>
                </span>
                <button v-if="!confirmClear" type="button" class="bp-btn" :disabled="!store.items.length" @click="askClear()">{{ t('house.actions.clearAll') }}</button>
                <span v-else class="grp">
                  <button type="button" class="bp-btn danger" @click="pick(doClear)">{{ t('house.actions.confirmClear') }}</button>
                  <button type="button" class="bp-btn" @click="confirmClear = false">{{ t('house.actions.cancel') }}</button>
                </span>
              </div>
              <button v-if="layouts.status !== 'local'" type="button" class="bp-btn" :class="{ 'is-active': layouts.autosave }" :title="t('house.layouts.autosaveHint')" @click="layouts.autosave = !layouts.autosave">{{ t('house.layouts.autosave') }}</button>
            </section>

            <section>
              <h4 class="bp-label">{{ t('house.menuGroups.file') }}</h4>
              <div class="grp">
                <button type="button" class="bp-btn" @click="pick(exportJson)">{{ t('house.tools.exportJson') }}</button>
                <button type="button" class="bp-btn" @click="pick(() => fileInput?.click())">{{ t('house.tools.importJson') }}</button>
              </div>
              <div class="grp">
                <button type="button" class="bp-btn" @click="pick(() => emit('snapshot'))">{{ t('house.tools.png') }}</button>
                <button type="button" class="bp-btn" :title="t('house.print.hint')" @click="pick(() => emit('print'))">{{ t('house.print.button') }}</button>
              </div>
            </section>

            <button type="button" class="bp-btn help" @click="pick(() => (store.helpOpen = true))">{{ t('house.help.button') }}</button>
          </div>
        </div>
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
.save-chip {
  font-size: 12px;
}
.save-chip.is-saved {
  color: var(--color-text-tertiary);
}
.save-chip.is-unsaved,
.save-chip.is-saving {
  color: var(--el-color-warning-dark-2, #b26a00);
}
.save-chip.is-error {
  color: var(--color-danger);
}
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
.mode .bp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mode svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.end {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}
.more-wrap {
  position: relative;
}
.panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 60;
  width: max-content;
  max-width: min(340px, calc(100vw - 20px));
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  box-shadow: 0 10px 30px rgb(0 0 0 / 22%);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.panel section {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.panel h4 {
  flex-basis: 100%;
  margin: 0;
}
.panel .grp {
  flex-wrap: wrap;
}
.help {
  align-self: flex-start;
}
@media (min-width: 560px) {
  .phone-only {
    display: none !important;
  }
}
@media (max-width: 559px) {
  /* small phones: one compact row — icon-only mode toggle, flexible picker; Layouts / Share live in More */
  .desk-only,
  .mode .lbl {
    display: none;
  }
  .toolbar {
    padding: 6px 8px;
    gap: 6px;
  }
  .row {
    gap: 6px;
  }
  .end {
    margin-left: 0;
    flex-shrink: 0;
  }
  .mode .bp-btn {
    padding-inline: 12px;
  }
}
</style>
