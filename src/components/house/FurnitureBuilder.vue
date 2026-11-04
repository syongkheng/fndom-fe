<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PART_SHAPES, categories, type FurniturePart, type PartShape } from '@/constants/houseplan/furniture'
import { resolveParts } from '@/constants/houseplan/furnitureModels'
import { cloneParts, MAX_PART_COUNT, newPart, partsSize } from '@/utilities/furniturePartsGeometry'
import { useHousePlanStore } from '@/stores/housePlan'
import { useThemeStore } from '@/stores/theme'
import { useToast } from '@/composables/useToast'
import { disposeTree } from '@/three/house/buildPlan'
import { buildPartsModel, type PartsModel } from '@/three/house/furnitureParts'

const { t } = useI18n()
const store = useHousePlanStore()
const theme = useThemeStore()
const toast = useToast()

// Local draft, copied from the store so Cancel leaves the catalogue untouched.
const draft = store.builder!
const editId = draft.editId
const name = ref(draft.name)
const parts = ref<FurniturePart[]>(cloneParts(draft.parts))
const sel = ref<number | null>(parts.value.length ? 0 : null)
const newShape = ref<PartShape>('box')

const cur = computed(() => (sel.value !== null ? parts.value[sel.value] ?? null : null))
const size = computed(() => partsSize(parts.value))
const cm = (m: number) => Math.round(m * 1000) / 10 // metres -> cm, 0.1 precision

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

type NumKey = 'sx' | 'sy' | 'sz' | 'px' | 'py' | 'pz'
function setNum(key: NumKey, e: Event) {
  const part = cur.value
  const v = parseFloat((e.target as HTMLInputElement).value)
  if (!part || !Number.isFinite(v)) return
  const m = v / 100
  part[key] = key.startsWith('s') ? clamp(m, 0.01, 20) : key === 'py' ? clamp(m, 0, 20) : clamp(m, -20, 20)
}

function setRange(key: 'ry' | 'round' | 'taper', e: Event) {
  const part = cur.value
  if (part) part[key] = parseFloat((e.target as HTMLInputElement).value)
}

function setColor(e: Event) {
  if (cur.value) cur.value.color = (e.target as HTMLInputElement).value
}

// ---- part list actions ----
function addPart() {
  if (parts.value.length >= MAX_PART_COUNT) {
    toast.error(t('house.builder.tooMany', { n: MAX_PART_COUNT }))
    return
  }
  const shape = newShape.value
  // New parts start beside the existing model, resting on the floor, so they are easy to find.
  const b = parts.value.length ? size.value.w / 2 + 0.3 : 0
  parts.value.push(newPart({ shape, sx: 0.4, sy: 0.4, sz: 0.4, px: b, round: shape === 'box' ? 0.2 : 0 }))
  sel.value = parts.value.length - 1
}

function duplicatePart(mirror: boolean) {
  const part = cur.value
  if (!part || parts.value.length >= MAX_PART_COUNT) return
  const copy: FurniturePart = mirror
    ? { ...part, px: -part.px, ry: (360 - part.ry) % 360 }
    : { ...part, px: part.px + 0.1, pz: part.pz + 0.1 }
  parts.value.push(copy)
  sel.value = parts.value.length - 1
}

function removePart() {
  if (sel.value === null) return
  parts.value.splice(sel.value, 1)
  sel.value = parts.value.length ? Math.min(sel.value, parts.value.length - 1) : null
}

function startFrom(e: Event) {
  const select = e.target as HTMLSelectElement
  const src = store.fullCatalogue.find((c) => c.id === select.value)
  select.value = ''
  if (!src) return
  parts.value = cloneParts(resolveParts(src.id, src.w, src.d, src.h, src.parts))
  sel.value = parts.value.length ? 0 : null
  fitCamera()
}

function save(andPlace: boolean, asNew = false) {
  store.saveCustomModel(name.value, parts.value, asNew ? null : editId, andPlace)
}

// ---- 3D preview (its own small scene; Three objects stay outside Vue reactivity) ----
const host = ref<HTMLDivElement>()
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let grid: THREE.GridHelper | null = null
let model: PartsModel | null = null
let raf = 0
let dirty = true
let observer: ResizeObserver | null = null
let down: [number, number] | null = null

function rebuild() {
  if (!scene) return
  if (model) {
    scene.remove(model.group)
    disposeTree(model.group)
  }
  model = markRaw(buildPartsModel(parts.value, 0x3fb07a))
  scene.add(model.group)
  model.highlight(sel.value)
  dirty = true
}

/** Frames the whole model; called on open and whenever a different piece is loaded. */
function fitCamera() {
  if (!camera || !controls) return
  const s = size.value
  const reach = Math.max(s.w, s.d, s.h, 0.8)
  camera.position.set(reach * 1.5, reach * 1.1 + 0.3, reach * 1.7)
  controls.target.set(0, s.h / 2, 0)
  controls.update()
  dirty = true
}

function resize() {
  if (!host.value || !renderer || !camera) return
  const w = Math.max(1, host.value.clientWidth)
  const h = Math.max(1, host.value.clientHeight)
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  dirty = true
}

function frame() {
  raf = requestAnimationFrame(frame)
  const moved = controls?.update()
  if ((moved || dirty) && renderer && scene && camera) {
    dirty = false
    renderer.render(scene, camera)
  }
}

function setGridTheme(dark: boolean) {
  if (!scene) return
  if (grid) {
    scene.remove(grid)
    grid.dispose()
  }
  grid = new THREE.GridHelper(6, 12, dark ? 0xc9b3a2 : 0x6e5648, dark ? 0x5a4a40 : 0xdcc9b6)
  scene.add(grid)
  dirty = true
}

function onPointerDown(e: PointerEvent) {
  down = [e.clientX, e.clientY]
}
function onPointerUp(e: PointerEvent) {
  if (!down || !renderer || !camera || !model) return
  const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1])
  down = null
  if (moved > 4) return // an orbit drag, not a click
  const rect = renderer.domElement.getBoundingClientRect()
  const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
  const ray = new THREE.Raycaster()
  ray.setFromCamera(ndc, camera)
  const hit = ray.intersectObjects(model.meshes, false)[0]
  if (hit) sel.value = hit.object.userData.partIndex as number
}

onMounted(() => {
  if (!host.value) return
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.domElement.style.display = 'block'
  host.value.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0xffffff, 1.2))
  const sun = new THREE.DirectionalLight(0xffffff, 2.2)
  sun.position.set(3, 10, 6)
  scene.add(sun)

  camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2 - 0.02
  controls.minDistance = 0.4
  controls.maxDistance = 20
  controls.addEventListener('change', () => (dirty = true))
  fitCamera()

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  observer = new ResizeObserver(resize)
  observer.observe(host.value)
  resize()
  setGridTheme(theme.isDark)
  rebuild()
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  controls?.dispose()
  if (scene) disposeTree(scene)
  renderer?.domElement.remove()
  renderer?.dispose()
  renderer = scene = camera = controls = grid = model = null
})

watch(parts, rebuild, { deep: true })
watch(sel, (i) => {
  model?.highlight(i)
  dirty = true
})
watch(() => theme.isDark, setGridTheme)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    store.closeBuilder()
  }
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))

const startGroups = computed(() =>
  categories
    .map((cat) => ({ cat, items: store.fullCatalogue.filter((c) => c.category === cat) }))
    .filter((g) => g.items.length),
)
</script>

<template>
  <Teleport to="body">
    <div class="fb-backdrop" @mousedown.self="store.closeBuilder()">
      <section class="fb" role="dialog" aria-modal="true" :aria-label="t('house.builder.title')">
        <header class="fb-head">
          <div class="fb-titles">
            <h2 class="fb-title">{{ t('house.builder.title') }}</h2>
            <p v-if="editId" class="fb-sub">{{ t('house.builder.editing', { name: draft.name }) }}</p>
          </div>
          <button type="button" class="fb-x" :aria-label="t('house.builder.cancel')" @click="store.closeBuilder()">×</button>
        </header>

        <div class="fb-body">
          <div class="fb-left">
            <div ref="host" class="fb-preview" role="img" :aria-label="t('house.builder.previewLabel')"></div>
            <p class="fb-hint">{{ t('house.builder.previewHint') }}</p>
            <p class="fb-total">{{ t('house.builder.total', { w: cm(size.w), d: cm(size.d), h: cm(size.h) }) }}</p>
          </div>

          <div class="fb-right">
            <label class="fld">
              <span>{{ t('house.builder.name') }}</span>
              <input v-model="name" type="text" maxlength="60" :placeholder="t('house.builder.namePh')" />
            </label>

            <label class="fld">
              <span>{{ t('house.builder.startFrom') }}</span>
              <select class="bp-btn" @change="startFrom">
                <option value="">{{ t('house.builder.startPick') }}</option>
                <optgroup v-for="g in startGroups" :key="g.cat" :label="t(`house.categories.${g.cat}`)">
                  <option v-for="c in g.items" :key="c.id" :value="c.id">{{ store.displayName(c.id, c.name) }}</option>
                </optgroup>
              </select>
            </label>

            <div class="fb-sec">
              <div class="fb-sec-head">
                <h3>{{ t('house.builder.parts') }} ({{ parts.length }})</h3>
                <div class="add-row">
                  <select v-model="newShape" class="bp-btn" :aria-label="t('house.builder.shape')">
                    <option v-for="s in PART_SHAPES" :key="s" :value="s">{{ t(`house.builder.shapes.${s}`) }}</option>
                  </select>
                  <button type="button" class="bp-btn" @click="addPart">{{ t('house.builder.addPart') }}</button>
                </div>
              </div>
              <ul class="part-list">
                <li v-for="(p, i) in parts" :key="i">
                  <button type="button" class="part" :class="{ on: sel === i }" @click="sel = i">
                    <span class="swatch" :style="{ background: p.color ?? '#3fb07a' }" aria-hidden="true"></span>
                    {{ t('house.builder.partN', { n: i + 1 }) }} · {{ t(`house.builder.shapes.${p.shape}`) }}
                  </button>
                </li>
              </ul>
            </div>

            <div v-if="cur" class="fb-sec editor">
              <div class="row-btns">
                <button type="button" class="bp-btn" @click="duplicatePart(false)">{{ t('house.builder.duplicate') }}</button>
                <button type="button" class="bp-btn" :title="t('house.builder.mirrorHint')" @click="duplicatePart(true)">{{ t('house.builder.mirror') }}</button>
                <button type="button" class="bp-btn danger" :disabled="parts.length < 2" @click="removePart">{{ t('house.builder.remove') }}</button>
              </div>

              <label class="fld">
                <span>{{ t('house.builder.shape') }}</span>
                <select v-model="cur.shape" class="bp-btn">
                  <option v-for="s in PART_SHAPES" :key="s" :value="s">{{ t(`house.builder.shapes.${s}`) }}</option>
                </select>
              </label>

              <fieldset>
                <legend>{{ t('house.builder.size') }}</legend>
                <label class="num"><span>{{ t('house.builder.w') }}</span><input type="number" min="1" step="1" :value="cm(cur.sx)" @change="setNum('sx', $event)" /></label>
                <label class="num"><span>{{ t('house.builder.d') }}</span><input type="number" min="1" step="1" :value="cm(cur.sz)" @change="setNum('sz', $event)" /></label>
                <label class="num"><span>{{ t('house.builder.h') }}</span><input type="number" min="1" step="1" :value="cm(cur.sy)" @change="setNum('sy', $event)" /></label>
              </fieldset>

              <fieldset>
                <legend>{{ t('house.builder.position') }}</legend>
                <label class="num"><span>{{ t('house.builder.x') }}</span><input type="number" step="1" :value="cm(cur.px)" @change="setNum('px', $event)" /></label>
                <label class="num"><span>{{ t('house.builder.z') }}</span><input type="number" step="1" :value="cm(cur.pz)" @change="setNum('pz', $event)" /></label>
                <label class="num"><span>{{ t('house.builder.y') }}</span><input type="number" min="0" step="1" :value="cm(cur.py)" @change="setNum('py', $event)" /></label>
              </fieldset>

              <label class="rng">
                <span>{{ t('house.builder.rotation') }} <b>{{ Math.round(cur.ry) }}°</b></span>
                <input type="range" min="0" max="355" step="5" :value="cur.ry" @input="setRange('ry', $event)" />
              </label>
              <label v-if="cur.shape === 'box'" class="rng">
                <span>{{ t('house.builder.round') }} <b>{{ Math.round(cur.round * 100) }}%</b></span>
                <input type="range" min="0" max="1" step="0.05" :value="cur.round" @input="setRange('round', $event)" />
              </label>
              <label v-if="cur.shape === 'cylinder'" class="rng">
                <span>{{ t('house.builder.taper') }} <b>{{ Math.round(cur.taper * 100) }}%</b></span>
                <input type="range" min="0.1" max="1" step="0.05" :value="cur.taper" @input="setRange('taper', $event)" />
              </label>

              <div class="fld color-row">
                <span>{{ t('house.builder.color') }}</span>
                <input type="color" :value="cur.color ?? '#3fb07a'" :aria-label="t('house.builder.color')" @input="setColor" />
                <button type="button" class="bp-btn" :disabled="!cur.color" @click="cur.color = undefined">{{ t('house.builder.colorReset') }}</button>
              </div>
            </div>
            <p v-else class="fb-hint">{{ t('house.builder.noPart') }}</p>
          </div>
        </div>

        <footer class="fb-foot">
          <button type="button" class="bp-btn" @click="store.closeBuilder()">{{ t('house.builder.cancel') }}</button>
          <span class="spacer"></span>
          <template v-if="editId">
            <button type="button" class="bp-btn" :disabled="!name.trim() || !parts.length" @click="save(false, true)">{{ t('house.builder.saveCopy') }}</button>
            <button type="button" class="bp-btn is-active" :disabled="!name.trim() || !parts.length" @click="save(false)">{{ t('house.builder.update') }}</button>
          </template>
          <template v-else>
            <button type="button" class="bp-btn" :disabled="!name.trim() || !parts.length" @click="save(false)">{{ t('house.builder.save') }}</button>
            <button type="button" class="bp-btn is-active" :disabled="!name.trim() || !parts.length" @click="save(true)">{{ t('house.builder.savePlace') }}</button>
          </template>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.fb-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000; /* above the sticky header (9999) */
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgba(30, 18, 12, 0.5);
}
.fb {
  display: flex;
  flex-direction: column;
  width: min(1000px, 100%);
  max-height: 100%;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-pop);
  overflow: hidden;
}
.fb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-divider);
}
.fb-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-heading);
}
.fb-sub {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}
.fb-x {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--color-text);
  cursor: pointer;
}
.fb-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.fb-left {
  flex-shrink: 0;
  padding: 12px 16px 0;
}
.fb-preview {
  width: 100%;
  height: 34dvh;
  min-height: 220px;
  border: 1px solid var(--color-divider);
  border-radius: var(--radius);
  background: var(--color-background);
  overflow: hidden;
  touch-action: none;
}
.fb-hint {
  margin: 6px 0 0;
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}
.fb-total {
  margin: 4px 0 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-heading);
}
.fb-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
}
@media (min-width: 800px) {
  .fb {
    height: min(720px, 100%);
  }
  .fb-body {
    flex-direction: row;
    overflow: hidden;
  }
  .fb-left {
    flex: 1.15;
    display: flex;
    flex-direction: column;
    padding-bottom: 12px;
  }
  .fb-preview {
    flex: 1;
    height: auto;
  }
  .fb-right {
    flex: 1;
    overflow-y: auto;
  }
}
.fld {
  display: grid;
  gap: 4px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}
.fld input[type='text'],
.num input,
.fld select {
  font: inherit;
  font-size: 16px; /* avoids the iOS zoom-on-focus */
  font-weight: 400;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-background);
  color: var(--color-text);
  min-width: 0;
}
.fb-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.fb-sec-head h3 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-heading);
}
.add-row {
  display: flex;
  gap: 6px;
}
.part-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.part {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  font: inherit;
  font-size: 0.78rem;
  color: var(--color-text);
  cursor: pointer;
}
.part.on {
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 700;
}
.swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.25);
}
.editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-divider);
}
.row-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
fieldset {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 8px;
  margin: 0;
  padding: 0;
  border: none;
}
legend {
  padding: 0;
  margin-bottom: 4px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}
.num {
  display: grid;
  gap: 2px;
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}
.rng {
  display: grid;
  gap: 2px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}
.rng b {
  font-family: var(--font-mono);
  color: var(--color-heading);
}
.rng input {
  accent-color: var(--color-primary);
}
.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.color-row input[type='color'] {
  width: 40px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: none;
}
.danger {
  color: var(--color-danger);
}
.fb-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--color-divider);
}
.spacer {
  flex: 1;
}
</style>
