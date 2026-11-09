import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { activePlan, roomIdAt, wallSpan, type Wall } from '@/constants/houseplan/floorplan'
import { catalogue, categories, type CatalogItem, type Category, type FurniturePart, type PlacedItem } from '@/constants/houseplan/furniture'
import { resolveParts } from '@/constants/houseplan/furnitureModels'
import { couplesHome } from '@/constants/houseplan/presets'
import { cleanParts, cloneParts, newPart, normalizeParts, partsSize } from '@/utilities/furniturePartsGeometry'
import { clearanceIssues, findConflicts, footprint, isQuarterTurn, itemCorners, planSnapPoints, nearestGaps, snapEdge, snapFlush, wallRects } from '@/utilities/houseGeometry'
import type { ClearanceIssue } from '@/utilities/houseGeometry'
import type { HouseMode, HousePreset } from '@/interfaces/House.model'
import { useToast } from '@/composables/useToast'
import { i18n } from '@/i18n'

const STORAGE_KEY = 'fndom-house-layout-v1'
const LABELS_KEY = 'fndom-house-labels'
const CLEARANCE_KEY = 'fndom-house-clearance'
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
const MIN_SIZE = 0.1
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
  // any angle is kept (to 0.1°); a stray non-number becomes 0
  const r = isNum(rot) ? (((Math.round(rot * 10) / 10) % 360) + 360) % 360 : 0
  return {
    uid: typeof raw.uid === 'string' && raw.uid ? raw.uid : newUid(),
    catalogId: String(raw.catalogId ?? 'custom'),
    name: String(raw.name ?? 'Item').slice(0, 60),
    w, d, h, category,
    x: clamp(x, 0, activePlan.width),
    y: clamp(y, 0, activePlan.depth),
    rot: r,
    parts: cleanParts(raw.parts),
    ...(raw.locked === true ? { locked: true } : {}),
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
  /** Name + size labels on the pieces; remembered per browser. */
  const showLabels = ref(true)
  try {
    showLabels.value = localStorage.getItem(LABELS_KEY) !== '0'
  } catch {
    /* storage unavailable: keep the default */
  }
  watch(showLabels, (on) => {
    try {
      localStorage.setItem(LABELS_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  })
  /** Amber warnings for tight walkways / blocked doorways; remembered per browser. */
  const showClearance = ref(true)
  try {
    showClearance.value = localStorage.getItem(CLEARANCE_KEY) !== '0'
  } catch {
    /* storage unavailable: keep the default */
  }
  watch(showClearance, (on) => {
    try {
      localStorage.setItem(CLEARANCE_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  })
  /** Keyboard-shortcuts sheet. */
  const helpOpen = ref(false)
  /** One-time tips card; remembered once dismissed. */
  const TIPS_KEY = 'fndom-house-tips-seen'
  const tipsSeen = ref(false)
  try {
    tipsSeen.value = localStorage.getItem(TIPS_KEY) === '1'
  } catch {
    /* storage unavailable: show the tips each visit */
  }
  function dismissTips() {
    tipsSeen.value = true
    try {
      localStorage.setItem(TIPS_KEY, '1')
    } catch {
      /* ignore */
    }
  }
  const undoStack = ref<Snap[]>([])
  const redoStack = ref<Snap[]>([])

  const fullCatalogue = computed(() => [...catalogue, ...custom.value])
  const selected = computed(() => items.value.find((i) => i.uid === selectedId.value) ?? null)
  const wallsEdited = computed(() => JSON.stringify(walls.value) !== defaultWalls)
  const wallBoxes = computed(() => wallRects({ ...plan, walls: walls.value }))
  const planPoints = computed(() => planSnapPoints({ ...plan, walls: walls.value }))
  const conflicts = computed(() => findConflicts(items.value, wallBoxes.value))
  const clearance = computed(() => (showClearance.value ? clearanceIssues(items.value, walls.value, plan.wallThickness) : new Map<string, ClearanceIssue[]>()))
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  /** Pieces per numbered room (by centre point), plus those outside every room area. */
  const roomContents = computed(() => {
    const byRoom = new Map<number, PlacedItem[]>()
    const outside: PlacedItem[] = []
    for (const it of items.value) {
      const id = roomIdAt(it.x, it.y)
      if (id === null) outside.push(it)
      else byRoom.set(id, [...(byRoom.get(id) ?? []), it])
    }
    return { byRoom, outside }
  })
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

  /** True while a shared (read-only) house is shown: nothing is written to the browser and the user's own draft is held aside. */
  const readOnly = ref(false)
  let heldDraft: { items: PlacedItem[]; custom: CatalogItem[]; walls: Wall[]; mode: HouseMode; preset: HousePreset } | null = null

  function save() {
    if (readOnly.value) return
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

  function toggleLock(uid: string) {
    const it = items.value.find((i) => i.uid === uid)
    if (!it) return
    commit()
    if (it.locked) delete it.locked
    else it.locked = true
  }

  function rotateSelected() {
    const it = selected.value
    if (!it || it.locked) return
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
    delete copy.locked // a copy starts unlocked
    items.value.push(copy)
    selectedId.value = copy.uid
  }

  // ---- copy / paste ------------------------------------------------------
  const clipboard = ref<PlacedItem | null>(null)
  let pasteStep = 0

  const cloneItem = (it: PlacedItem): PlacedItem => JSON.parse(JSON.stringify(it))

  function copySelected(quiet = false): boolean {
    const it = selected.value
    if (!it) return false
    clipboard.value = cloneItem(it)
    pasteStep = 0
    if (!quiet) toast.info(t('house.toast.copied', { name: displayName(it.catalogId, it.name) }))
    return true
  }

  function cutSelected() {
    if (copySelected(true)) deleteSelected()
  }

  /** Pastes the copied piece centred on `at` (plan metres, 5 cm grid) if given, else stepped 30 cm down-right from where it was copied. */
  function paste(at: [number, number] | null) {
    const src = clipboard.value
    if (!src) return
    commit()
    let x: number
    let y: number
    if (at) {
      x = Math.round(at[0] * 20) / 20
      y = Math.round(at[1] * 20) / 20
    } else {
      pasteStep += 1
      x = src.x + 0.3 * pasteStep
      y = src.y + 0.3 * pasteStep
    }
    const copy: PlacedItem = { ...cloneItem(src), uid: newUid(), x: clamp(round2(x), 0, plan.width), y: clamp(round2(y), 0, plan.depth) }
    delete copy.locked // a copy starts unlocked
    items.value.push(copy)
    selectedId.value = copy.uid
  }

  /** A toast with an Undo button that only acts while the delete is still the latest change (else it would undo something else). */
  function toastUndo(message: string) {
    const depth = undoStack.value.length
    toast.action(message, { label: t('house.toast.undo'), onClick: () => { if (undoStack.value.length === depth) undo() } }, { ring: true, duration: 6000 })
  }

  function deleteSelected() {
    const it = selected.value
    if (!it) return
    const name = displayName(it.catalogId, it.name)
    commit()
    items.value = items.value.filter((i) => i.uid !== selectedId.value)
    selectedId.value = null
    toastUndo(t('house.toast.deleted', { name }))
  }

  function clearAll() {
    if (!items.value.length) return
    const n = items.value.length
    commit()
    items.value = []
    selectedId.value = null
    toastUndo(t('house.toast.cleared', { n }))
  }

  function nudgeSelected(dx: number, dy: number) {
    const it = selected.value
    if (!it || it.locked) return
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
    if (!it || it.locked) return
    it.x = x
    it.y = y
  }

  /** Footprints of every piece except `uid`: what a dragged or resized piece can snap against. */
  const otherRects = (uid: string) => items.value.filter((i) => i.uid !== uid).map(footprint)

  /** Where a dragged piece lands if brought close to a wall or another piece: flush against it (or edge-aligned with a neighbour). Alt in the canvas skips. */
  function snapDrag(uid: string, x: number, y: number): [number, number] {
    const it = items.value.find((i) => i.uid === uid)
    if (!it) return [x, y]
    const others = otherRects(uid)
    const { dx, dy } = snapFlush(footprint({ ...it, x, y }), [...wallBoxes.value, ...others], 0.15, others)
    // 1e-6 rounding keeps flush edges inside the overlap tolerance of findConflicts
    const r6 = (v: number) => Math.round(v * 1e6) / 1e6
    return [clamp(r6(x + dx), 0, plan.width), clamp(r6(y + dy), 0, plan.depth)]
  }

  /** Sets the selected piece's angle (degrees, clockwise) from the info-bar field; one undo step. */
  function setSelectedRotation(deg: number) {
    const it = selected.value
    if (!it || it.locked || !Number.isFinite(deg)) return
    const r = (((Math.round(deg * 10) / 10) % 360) + 360) % 360
    if (r === it.rot) return
    commit()
    it.rot = r
  }

  /** Turns the selected piece by a relative amount ([ and ] keys: 15 degrees). */
  function rotateBy(delta: number) {
    const it = selected.value
    if (!it || it.locked) return
    commit()
    it.rot = (((it.rot + delta) % 360) + 360) % 360
  }

  /** Distances from a piece to the nearest walls / pieces on each side, shown while it is dragged or resized. */
  function guidesFor(uid: string) {
    const it = items.value.find((i) => i.uid === uid)
    return it ? nearestGaps(footprint(it), [...wallBoxes.value, ...otherRects(uid)]) : []
  }

  // ---- typed size / drag rotation ------------------------------------------
  /**
   * Sets the selected piece's size from the info-bar fields. `axis` is as drawn on the plan: 'x' is the east-west extent
   * (the piece's width, or its depth when turned 90/270), 'y' north-south, 'h' height. Own models are stretched to match.
   */
  function setSelectedSize(axis: 'x' | 'y' | 'h', metres: number) {
    const it = selected.value
    if (!it || it.locked || !Number.isFinite(metres)) return
    const v = clamp(Math.round(metres * 100) / 100, MIN_SIZE, 20)
    const turned = isQuarterTurn(it.rot) && it.rot % 180 !== 0 // a freely turned piece shows (and edits) its own width / depth
    const key = axis === 'h' ? 'h' : (axis === 'x') !== turned ? 'w' : 'd'
    if (it[key] === v) return
    commit()
    const prev = { w: it.w, d: it.d, h: it.h }
    it[key] = v
    if (it.parts) {
      const kw = it.w / prev.w
      const kd = it.d / prev.d
      const kh = it.h / prev.h
      it.parts = it.parts.map((p) => ({ ...p, px: p.px * kw, sx: p.sx * kw, pz: p.pz * kd, sz: p.sz * kd, py: p.py * kh, sy: p.sy * kh }))
    }
    // stay inside the plan: nudge the centre back if growing pushed an edge out
    const f = footprint(it)
    if (f.x0 < 0) it.x = round2(it.x - f.x0)
    if (f.x1 > plan.width) it.x = round2(it.x - (f.x1 - plan.width))
    if (f.y0 < 0) it.y = round2(it.y - f.y0)
    if (f.y1 > plan.depth) it.y = round2(it.y - (f.y1 - plan.depth))
  }

  let rotateStarted = false
  /** Called when a rotate-handle drag starts: its first change becomes the one undo step. */
  function beginRotate() {
    rotateStarted = false
  }
  /**
   * Turns a piece to an absolute angle from the rotate handle. Whole degrees; it clicks onto 0/90/180/270 when within 4°
   * (hold Alt to turn freely) and goes in 15° steps with Shift.
   */
  function rotateTo(uid: string, deg: number, shift = false, alt = false) {
    const it = items.value.find((i) => i.uid === uid)
    if (!it || it.locked) return
    let r = ((deg % 360) + 360) % 360
    if (shift) r = Math.round(r / 15) * 15
    else if (!alt) {
      const q = Math.round(r / 90) * 90
      if (Math.abs(r - q) <= 4) r = q
    }
    r = ((Math.round(r) % 360) + 360) % 360
    if (r === it.rot) return
    if (!rotateStarted) {
      commit()
      rotateStarted = true
    }
    it.rot = r
  }

  // ---- corner resize -----------------------------------------------------
  let resizeBase: { w: number; d: number; parts?: FurniturePart[] } | null = null

  /** Called once when a corner drag actually changes something: one undo step, and remembers the starting size/model. */
  function beginResize(uid: string) {
    const it = items.value.find((i) => i.uid === uid)
    if (!it) return
    commit()
    resizeBase = { w: it.w, d: it.d, parts: it.parts ? cloneParts(it.parts) : undefined }
  }

  /**
   * Drags one corner of a piece's footprint to (cx, cy) with the opposite corner (ax, ay) fixed. Width/depth follow the
   * footprint (swapped when turned 90/270); built-in models rebuild from w/d, own models are stretched from their
   * starting shape so repeated drags never accumulate error. Height is untouched (use the shape editor).
   */
  function resizeTo(uid: string, ax: number, ay: number, cx: number, cy: number, snap: boolean) {
    const it = items.value.find((i) => i.uid === uid)
    if (!it || !resizeBase) return
    const r6 = (v: number) => Math.round(v * 1e6) / 1e6
    let mx = clamp(cx, 0, plan.width)
    let my = clamp(cy, 0, plan.depth)
    if (snap) {
      const obstacles = [...wallBoxes.value, ...otherRects(uid)]
      mx = snapEdge(mx, 'x', Math.min(ay, my), Math.max(ay, my), obstacles)
      my = snapEdge(my, 'y', Math.min(ax, mx), Math.max(ax, mx), obstacles)
    }
    const ex = Math.max(MIN_SIZE, Math.abs(mx - ax))
    const ey = Math.max(MIN_SIZE, Math.abs(my - ay))
    const nx = ax + (mx >= ax ? ex : -ex)
    const ny = ay + (my >= ay ? ey : -ey)
    const turned = it.rot % 180 !== 0
    it.w = r6(turned ? ey : ex)
    it.d = r6(turned ? ex : ey)
    it.x = r6((ax + nx) / 2)
    it.y = r6((ay + ny) / 2)
    if (resizeBase.parts) {
      const kw = it.w / resizeBase.w
      const kd = it.d / resizeBase.d
      it.parts = resizeBase.parts.map((p) => ({ ...p, px: p.px * kw, sx: p.sx * kw, pz: p.pz * kd, sz: p.sz * kd }))
    }
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
    // A door drawn along the inside of an existing wall cuts that wall around it, so no erasing first.
    if (kind === 'door') {
      const horizontal = y1 === y2
      const [lo, hi] = horizontal ? [Math.min(x1, x2), Math.max(x1, x2)] : [Math.min(y1, y2), Math.max(y1, y2)]
      const host = walls.value.findIndex((w) => {
        if (w.kind !== 'wall' || (horizontal ? w.y1 !== y1 || w.y2 !== y1 : w.x1 !== x1 || w.x2 !== x1)) return false
        const [a0, a1] = horizontal ? [Math.min(w.x1, w.x2), Math.max(w.x1, w.x2)] : [Math.min(w.y1, w.y2), Math.max(w.y1, w.y2)]
        return lo >= a0 - 1e-6 && hi <= a1 + 1e-6
      })
      if (host >= 0) {
        const w = walls.value[host]
        const [a0, a1] = horizontal ? [Math.min(w.x1, w.x2), Math.max(w.x1, w.x2)] : [Math.min(w.y1, w.y2), Math.max(w.y1, w.y2)]
        const piece = (from: number, to: number): Wall => (horizontal ? { ...w, x1: from, x2: to } : { ...w, y1: from, y2: to })
        const rest = [piece(a0, lo), piece(hi, a1)].filter((p) => (horizontal ? p.x2 - p.x1 : p.y2 - p.y1) >= MIN_WALL)
        walls.value.splice(host, 1, ...rest)
      }
    }
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

  // ---- shared (read-only) view ------------------------------------------
  /** Shows someone's shared layout in the 3D view without touching this browser's own draft. Returns the item count, or null if unusable. */
  function viewShared(data: unknown): number | null {
    const parsed = parseLayout(data)
    if (!parsed) return null
    if (!readOnly.value) {
      heldDraft = { items: items.value, custom: custom.value, walls: walls.value, mode: mode.value, preset: preset.value }
    }
    readOnly.value = true
    items.value = parsed.items
    custom.value = parsed.custom
    walls.value = parsed.walls ?? cloneWalls(plan.walls)
    undoStack.value = []
    redoStack.value = []
    selectedId.value = null
    mode.value = '3d'
    return parsed.items.length
  }

  /** Leaves the shared view and puts the user's own draft back. */
  function leaveShared() {
    if (!readOnly.value) return
    readOnly.value = false
    if (heldDraft) {
      items.value = heldDraft.items
      custom.value = heldDraft.custom
      walls.value = heldDraft.walls
      mode.value = heldDraft.mode
      preset.value = heldDraft.preset
      heldDraft = null
    }
    selectedId.value = null
  }

  // ---- import / export ---------------------------------------------------
  function exportJson(): string {
    const payload: Persisted = { version: 1, plan: plan.name, items: items.value, custom: custom.value, ...(wallsEdited.value ? { walls: walls.value } : {}) }
    return JSON.stringify(payload, null, 2)
  }

  /** The layout as plain data (what export writes), for saving to the backend. */
  function layoutData(): Persisted {
    return JSON.parse(exportJson())
  }

  /** Replaces the current layout with sanitised data as one undo step. Returns the number of items loaded, or null if unusable. */
  function applyLayout(data: unknown): number | null {
    const parsed = parseLayout(data)
    if (!parsed) return null
    commit()
    items.value = parsed.items
    custom.value = parsed.custom
    if (parsed.walls) walls.value = parsed.walls
    selectedId.value = null
    return parsed.items.length
  }

  /** Replaces the layout with the furnished sample home (one undo step). */
  function loadSample() {
    const n = applyLayout(couplesHome)
    if (n !== null) toast.success(t('house.toast.sampleLoaded', { n }))
  }

  function importJson(text: string): boolean {
    try {
      const n = applyLayout(JSON.parse(text))
      if (n === null) throw new Error('shape')
      toast.success(t('house.toast.imported', { n }))
      return true
    } catch {
      toast.error(t('house.toast.importFailed'))
      return false
    }
  }

  return {
    readOnly, viewShared, leaveShared, plan, walls, wallsEdited, wallTool, wallKind, planPoints, items, custom, selectedId, selected, mode, preset, presetTick, measuring, measureCm,
    fullCatalogue, conflicts, canUndo, canRedo, snapPoints,
    displayName, undo, redo, addFromCatalogue, select, rotateSelected, duplicateSelected, clipboard, helpOpen, tipsSeen, dismissTips, roomContents, setSelectedSize, setSelectedRotation, rotateBy, guidesFor, beginRotate, rotateTo, toggleLock, showClearance, clearance, copySelected, cutSelected, paste, deleteSelected, clearAll,
    setWallTool, toggleWallEdit, addWall, removeWall, resetWalls,
    nudgeSelected, beginDrag, dragTo, snapDrag, beginResize, resizeTo, showLabels, builder, openBuilder, closeBuilder, saveCustomModel, setMode, setPreset, toggleMeasure, exportJson, importJson, layoutData, applyLayout, loadSample,
  }
})
