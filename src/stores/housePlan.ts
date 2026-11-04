import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { activePlan, wallSpan, type Wall } from '@/constants/houseplan/floorplan'
import { catalogue, categories, type CatalogItem, type Category, type FurniturePart, type PlacedItem } from '@/constants/houseplan/furniture'
import { resolveParts } from '@/constants/houseplan/furnitureModels'
import { cleanParts, cloneParts, newPart, normalizeParts, partsSize } from '@/utilities/furniturePartsGeometry'
import { findConflicts, itemCorners, planSnapPoints, wallRects } from '@/utilities/houseGeometry'
import type { HouseMode, HousePreset } from '@/interfaces/House.model'
import { useToast } from '@/composables/useToast'
import { i18n } from '@/i18n'

const STORAGE_KEY = 'fndom-house-layout-v1'
const HISTORY_LIMIT = 100

interface Persisted {
  version: 1
  plan: string
  items: PlacedItem[]
  custom: CatalogItem[]
  /** Only written once the walls differ from the plan's own. */
  walls?: Wall[]
}

interface Snap {
  items: PlacedItem[]
  walls: Wall[]
}

export type WallTool = 'draw' | 'erase'
const MIN_WALL = 0.1
const MAX_WALLS = 400
const WALL_KINDS: Wall['kind'][] = ['wall', 'door', 'parapet']

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round2 = (v: number) => Math.round(v * 100) / 100
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

function newUid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any -- parsing untrusted JSON */
function cleanItem(raw: any): PlacedItem | null {
  if (!raw || typeof raw !== 'object') return null
  const { w, d, h, x, y, rot } = raw
  if (![w, d, h, x, y].every(isNum) || w <= 0 || d <= 0 || h <= 0) return null
  const category: Category = categories.includes(raw.category) ? raw.category : 'Custom'
  const r = isNum(rot) ? ((Math.round(rot / 90) * 90) % 360 + 360) % 360 : 0
  return {
    uid: typeof raw.uid === 'string' && raw.uid ? raw.uid : newUid(),
    catalogId: String(raw.catalogId ?? 'custom'),
    name: String(raw.name ?? 'Item').slice(0, 60),
    w, d, h, category,
    x: clamp(x, 0, activePlan.width),
    y: clamp(y, 0, activePlan.depth),
    rot: r,
    parts: cleanParts(raw.parts),
  }
}

function cleanCustom(raw: any): CatalogItem | null {
  if (!raw || typeof raw !== 'object') return null
  const { w, d, h } = raw
  if (![w, d, h].every(isNum) || w <= 0 || d <= 0 || h <= 0) return null
  return { id: String(raw.id ?? `custom-${newUid()}`), name: String(raw.name ?? 'Custom').slice(0, 60), w, d, h, category: 'Custom', parts: cleanParts(raw.parts) }
}

function cleanWalls(raw: any): Wall[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: Wall[] = []
  for (const w of raw.slice(0, MAX_WALLS)) {
    if (!w || typeof w !== 'object' || ![w.x1, w.y1, w.x2, w.y2].every(isNum) || !WALL_KINDS.includes(w.kind)) continue
    const axisAligned = w.x1 === w.x2 || w.y1 === w.y2
    const inside = [w.x1, w.x2].every((v: number) => v >= -1 && v <= activePlan.width + 1) && [w.y1, w.y2].every((v: number) => v >= -1 && v <= activePlan.depth + 1)
    if (!axisAligned || !inside || (w.x1 === w.x2 && w.y1 === w.y2)) continue
    out.push({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, kind: w.kind, ...wallSpan(w.kind, activePlan) })
  }
  return out
}

function parseLayout(data: any): { items: PlacedItem[]; custom: CatalogItem[]; walls?: Wall[] } | null {
  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) return null
  const items = data.items.map(cleanItem).filter((i: PlacedItem | null): i is PlacedItem => !!i)
  const custom = (Array.isArray(data.custom) ? data.custom : []).map(cleanCustom).filter((c: CatalogItem | null): c is CatalogItem => !!c)
  return { items, custom, walls: cleanWalls(data.walls) }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const useHousePlanStore = defineStore('housePlan', () => {
  const plan = activePlan
  const toast = useToast()
  const defaultWalls = JSON.stringify(plan.walls)
  const cloneWalls = (list: Wall[]) => list.map((w) => ({ ...w }))
  /** Editable copy of the plan's walls; everything wall-related (drawing, overlap checks, snapping) reads this. */
  const walls = ref<Wall[]>(cloneWalls(plan.walls))

  const items = ref<PlacedItem[]>([])
  const custom = ref<CatalogItem[]>([])
  const selectedId = ref<string | null>(null)
  const mode = ref<HouseMode>('arrange')
  const preset = ref<HousePreset>('3d')
  const presetTick = ref(0)
  const measuring = ref(false)
  const measureCm = ref<number | null>(null)
  const wallTool = ref<WallTool | null>(null)
  const wallKind = ref<Wall['kind']>('wall')
  /** The furniture builder's draft; null = closed. editId is the custom piece being edited, if any. */
  const builder = ref<{ editId: string | null; name: string; parts: FurniturePart[] } | null>(null)
  const undoStack = ref<Snap[]>([])
  const redoStack = ref<Snap[]>([])

  const fullCatalogue = computed(() => [...catalogue, ...custom.value])
  const selected = computed(() => items.value.find((i) => i.uid === selectedId.value) ?? null)
  const wallsEdited = computed(() => JSON.stringify(walls.value) !== defaultWalls)
  const wallBoxes = computed(() => wallRects({ ...plan, walls: walls.value }))
  const planPoints = computed(() => planSnapPoints({ ...plan, walls: walls.value }))
  const conflicts = computed(() => findConflicts(items.value, wallBoxes.value))
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const snapPoints = computed(() => [...planPoints.value, ...items.value.flatMap(itemCorners)])

  /** Localised name for a catalogue piece; custom pieces keep the name the user typed. */
  function displayName(catalogId: string, fallback: string): string {
    return catalogue.some((c) => c.id === catalogId) ? t(`house.furniture.${catalogId}`) : fallback
  }

  // ---- persistence -------------------------------------------------------
  function load() {
    try {
      const text = localStorage.getItem(STORAGE_KEY)
      if (!text) return
      const parsed = parseLayout(JSON.parse(text))
      if (parsed) {
        items.value = parsed.items
        custom.value = parsed.custom
        if (parsed.walls) walls.value = parsed.walls
      }
    } catch {
      /* storage unavailable or corrupt: start empty */
    }
  }

  function save() {
    try {
      const payload: Persisted = { version: 1, plan: plan.name, items: items.value, custom: custom.value, ...(wallsEdited.value ? { walls: walls.value } : {}) }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* storage unavailable or full: keep working in memory */
    }
  }

  load()
  watch([items, custom, walls], save, { deep: true })

  // ---- history -----------------------------------------------------------
  const snapshot = (): Snap => ({ items: items.value.map((i) => ({ ...i })), walls: cloneWalls(walls.value) })

  function commit() {
    undoStack.value.push(snapshot())
    if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift()
    redoStack.value = []
  }

  function fixSelection() {
    if (selectedId.value && !items.value.some((i) => i.uid === selectedId.value)) selectedId.value = null
  }

  function undo() {
    const prev = undoStack.value.pop()
    if (!prev) return
    redoStack.value.push(snapshot())
    items.value = prev.items
    walls.value = prev.walls
    fixSelection()
  }

  function redo() {
    const next = redoStack.value.pop()
    if (!next) return
    undoStack.value.push(snapshot())
    items.value = next.items
    walls.value = next.walls
    fixSelection()
  }

  // ---- item actions ------------------------------------------------------
  function place(src: CatalogItem, x: number, y: number, rot = 0): PlacedItem {
    return {
      uid: newUid(), catalogId: src.id, name: src.name,
      w: src.w, d: src.d, h: src.h, category: src.category, x, y, rot,
      ...(src.parts ? { parts: cloneParts(src.parts) } : {}),
    }
  }

  function addFromCatalogue(catalogId: string) {
    const src = fullCatalogue.value.find((c) => c.id === catalogId)
    if (!src) return
    commit()
    const item = place(src, plan.spawn[0], plan.spawn[1])
    items.value.push(item)
    selectedId.value = item.uid
  }

  function select(uid: string | null) {
    selectedId.value = uid
  }

  function rotateSelected() {
    const it = selected.value
    if (!it) return
    commit()
    it.rot = (it.rot + 90) % 360
  }

  function duplicateSelected() {
    const it = selected.value
    if (!it) return
    commit()
    const copy: PlacedItem = {
      ...it, uid: newUid(),
      x: clamp(round2(it.x + 0.3), 0, plan.width),
      y: clamp(round2(it.y + 0.3), 0, plan.depth),
    }
    items.value.push(copy)
    selectedId.value = copy.uid
  }

  function deleteSelected() {
    if (!selected.value) return
    commit()
    items.value = items.value.filter((i) => i.uid !== selectedId.value)
    selectedId.value = null
  }

  function clearAll() {
    if (!items.value.length) return
    commit()
    items.value = []
    selectedId.value = null
  }

  function nudgeSelected(dx: number, dy: number) {
    const it = selected.value
    if (!it) return
    commit()
    it.x = clamp(round2(it.x + dx), 0, plan.width)
    it.y = clamp(round2(it.y + dy), 0, plan.depth)
  }

  /** Called once when a drag actually moves the item, so taps leave no history entry. */
  function beginDrag() {
    commit()
  }

  function dragTo(uid: string, x: number, y: number) {
    const it = items.value.find((i) => i.uid === uid)
    if (!it) return
    it.x = x
    it.y = y
  }

  // ---- walls -------------------------------------------------------------
  /** Turns the wall tool on or off; it replaces the measure tool and furniture selection while active. */
  function setWallTool(tool: WallTool | null) {
    wallTool.value = tool
    if (tool) {
      measuring.value = false
      measureCm.value = null
      selectedId.value = null
    }
  }

  function toggleWallEdit() {
    setWallTool(wallTool.value ? null : 'draw')
  }

  /** Adds an axis-aligned wall; returns false for a degenerate, diagonal or duplicate segment. */
  function addWall(a: [number, number], b: [number, number]): boolean {
    const [x1, y1] = a
    const [x2, y2] = b
    if ((x1 !== x2 && y1 !== y2) || Math.hypot(x2 - x1, y2 - y1) < MIN_WALL || walls.value.length >= MAX_WALLS) return false
    const kind = wallKind.value
    const dup = walls.value.some((w) => w.kind === kind && ((w.x1 === x1 && w.y1 === y1 && w.x2 === x2 && w.y2 === y2) || (w.x1 === x2 && w.y1 === y2 && w.x2 === x1 && w.y2 === y1)))
    if (dup) return false
    commit()
    walls.value.push({ x1, y1, x2, y2, kind, ...wallSpan(kind, plan) })
    return true
  }

  function removeWall(index: number) {
    if (index < 0 || index >= walls.value.length) return
    commit()
    walls.value.splice(index, 1)
  }

  function resetWalls() {
    if (!wallsEdited.value) return
    commit()
    walls.value = cloneWalls(plan.walls)
  }

  // ---- furniture builder -------------------------------------------------
  /** Opens the builder: on the selected piece (editing it if it is a custom one, else as a copy), or on a fresh box. */
  function openBuilder(fromSelected = false) {
    const it = fromSelected ? selected.value : null
    if (it) {
      const own = custom.value.find((c) => c.id === it.catalogId)
      builder.value = {
        editId: own?.id ?? null,
        name: own ? own.name : displayName(it.catalogId, it.name),
        parts: cloneParts(resolveParts(it.catalogId, it.w, it.d, it.h, own?.parts ?? it.parts)),
      }
    } else {
      builder.value = { editId: null, name: '', parts: [newPart({ sx: 0.6, sy: 0.45, sz: 0.6, round: 0.2 })] }
    }
  }

  function closeBuilder() {
    builder.value = null
  }

  /**
   * Saves a model to the Custom catalogue (replacing `editId` when given) and optionally places it.
   * Editing also updates every copy already on the plan, as one undo step.
   */
  function saveCustomModel(name: string, rawParts: FurniturePart[], editId: string | null, andPlace: boolean): boolean {
    const n = name.trim()
    const parts = normalizeParts(cleanParts(rawParts) ?? [])
    const { w, d, h } = partsSize(parts)
    if (!n || !parts.length || w <= 0 || d <= 0 || h <= 0 || Math.max(w, d, h) > 20) {
      toast.error(t('house.toast.customInvalid'))
      return false
    }
    const existing = editId ? custom.value.find((c) => c.id === editId) : undefined
    let entry: CatalogItem
    if (existing) {
      Object.assign(existing, { name: n.slice(0, 60), w, d, h, parts })
      entry = existing
      if (items.value.some((i) => i.catalogId === existing.id)) {
        commit()
        for (const it of items.value) {
          if (it.catalogId !== existing.id) continue
          Object.assign(it, {
            name: entry.name, w, d, h,
            parts: cloneParts(parts),
            x: clamp(it.x, 0, plan.width), y: clamp(it.y, 0, plan.depth),
          })
        }
      }
    } else {
      entry = { id: `custom-${newUid()}`, name: n.slice(0, 60), w, d, h, category: 'Custom', parts }
      custom.value.push(entry)
    }
    toast.success(t('house.toast.customAdded', { name: entry.name }))
    builder.value = null
    if (andPlace) addFromCatalogue(entry.id)
    return true
  }

  // ---- views and tools ---------------------------------------------------
  function setMode(m: HouseMode) {
    mode.value = m
    if (m !== 'arrange') measuring.value = false
  }

  function setPreset(p: HousePreset) {
    preset.value = p
    mode.value = '3d'
    measuring.value = false
    presetTick.value++
  }

  function toggleMeasure() {
    if (mode.value !== 'arrange') return
    measuring.value = !measuring.value
    measureCm.value = null
    if (measuring.value) wallTool.value = null
  }

  // ---- import / export ---------------------------------------------------
  function exportJson(): string {
    const payload: Persisted = { version: 1, plan: plan.name, items: items.value, custom: custom.value, ...(wallsEdited.value ? { walls: walls.value } : {}) }
    return JSON.stringify(payload, null, 2)
  }

  function importJson(text: string): boolean {
    try {
      const parsed = parseLayout(JSON.parse(text))
      if (!parsed) throw new Error('shape')
      commit()
      items.value = parsed.items
      custom.value = parsed.custom
      if (parsed.walls) walls.value = parsed.walls
      selectedId.value = null
      toast.success(t('house.toast.imported', { n: parsed.items.length }))
      return true
    } catch {
      toast.error(t('house.toast.importFailed'))
      return false
    }
  }

  return {
    plan, walls, wallsEdited, wallTool, wallKind, planPoints, items, custom, selectedId, selected, mode, preset, presetTick, measuring, measureCm,
    fullCatalogue, conflicts, canUndo, canRedo, snapPoints,
    displayName, undo, redo, addFromCatalogue, select, rotateSelected, duplicateSelected, deleteSelected, clearAll,
    setWallTool, toggleWallEdit, addWall, removeWall, resetWalls,
    nudgeSelected, beginDrag, dragTo, builder, openBuilder, closeBuilder, saveCustomModel, setMode, setPreset, toggleMeasure, exportJson, importJson,
  }
})
