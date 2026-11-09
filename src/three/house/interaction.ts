import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import type { Point } from '@/constants/houseplan/floorplan'
import type { Gap } from '@/utilities/houseGeometry'
import type { FurnitureLayer } from './furnitureMesh'
import { disposeTree } from './buildPlan'
import type { PlannerScene } from './scene'

export interface InteractionHooks {
  isArrange(): boolean
  isMeasuring(): boolean
  itemPos(uid: string): Point | null
  bounds(): { w: number; d: number }
  snapPoints(): Point[]
  onSelect(uid: string | null): void
  /** Right-click (or long-press): the piece under the pointer if any, where on screen, and the plan point. */
  onContext(uid: string | null, clientX: number, clientY: number, at: Point | null): void
  isLocked(uid: string): boolean
  /** Double-click / double-tap on a piece. */
  onEdit(uid: string): void
  onDragStart(): void
  onDrag(uid: string, x: number, y: number): void
  /** The piece whose corner handles to show (arrange mode, no tool active), with its footprint; null hides them. */
  resizable(): { uid: string; rect: { x0: number; y0: number; x1: number; y1: number }; quarter: boolean } | null
  onResizeStart(uid: string): void
  /** Distance guides to show while a piece is dragged / resized. */
  guidesFor(uid: string): Gap[]
  onRotateStart(uid: string): void
  /** Absolute rotation in degrees from the rotate handle (0 = pointer straight above the piece); the store applies its snapping. */
  onRotateTo(uid: string, deg: number, shift: boolean, alt: boolean): void
  /** The rotate handle was clicked without dragging: turn the piece 90 degrees. */
  onRotateTap(uid: string): void
  onResize(uid: string, ax: number, ay: number, cx: number, cy: number, snap: boolean): void
  /** Adjusts a dragged piece's candidate position (e.g. flush to a wall). */
  snapDrag(uid: string, x: number, y: number): Point
  onMeasure(cm: number | null): void
  wallTool(): 'draw' | 'erase' | null
  /** Existing wall end points and outline corners, for snapping new walls. */
  wallSnapPoints(): Point[]
  onWallDraw(a: Point, b: Point): void
  onWallErase(index: number): void
}

export interface Interaction {
  /** Where the mouse last was over the plan (plan metres), or null if it has left / was never there. */
  cursor(): Point | null
  /** Repositions / shows / hides the corner handles; call after anything that moves or selects a piece. */
  syncHandles(): void
  clearMeasure(): void
  /** Drops an unfinished wall and any erase highlight. */
  clearWallDraft(): void
  dispose(): void
}

const TAP_SLOP_PX = 6
const MEASURE_SNAP_PX = 14
const DOUBLE_TAP_MS = 350
const DOUBLE_TAP_PX = 24
const MIN_WALL = 0.1
/** How close (m) a new wall end must be to an existing wall's coordinate to line up with it. */
const ALIGN_M = 0.08

/** Snap to the 5 cm grid. */
export const snap5 = (v: number) => Math.round(v * 20) / 20
const round2 = (v: number) => Math.round(v * 100) / 100
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface RotateState {
  pointerId: number
  uid: string
  centre: Point
  x: number
  y: number
  moved: boolean
}

interface ResizeState {
  pointerId: number
  uid: string
  anchor: Point
  started: boolean
}

interface DragState {
  pointerId: number
  uid: string
  dx: number
  dy: number
  started: boolean
}

export function createInteraction(sp: PlannerScene, furniture: FurnitureLayer, hooks: InteractionHooks): Interaction {
  const el = sp.container
  const canvas = sp.renderer.domElement
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()
  const tmp = new THREE.Vector3()

  let drag: DragState | null = null
  let resize: ResizeState | null = null
  let rotating: RotateState | null = null
  let lastCursor: Point | null = null
  // right button: a press that doesn't move opens the context menu (a moving one pans the camera)
  let rtap: { pointerId: number; x: number; y: number } | null = null
  let rightDownAt = 0
  let rightHandledAt = 0
  let tap: { pointerId: number; x: number; y: number } | null = null
  const down = new Set<number>()
  let lastTap: { uid: string; t: number; x: number; y: number } | null = null

  /** Records a tap on a piece (no drag movement); a second one on the same piece shortly after counts as a double-tap. */
  function registerTap(uid: string | null, e: PointerEvent) {
    const now = performance.now()
    if (!uid) {
      lastTap = null
      return
    }
    if (lastTap && lastTap.uid === uid && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX) {
      lastTap = null
      hooks.onEdit(uid)
      return
    }
    lastTap = { uid, t: now, x: e.clientX, y: e.clientY }
  }

  function aim(e: PointerEvent) {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(ndc, sp.activeCamera())
  }

  function pickUid(e: PointerEvent): string | null {
    aim(e)
    const hits = raycaster.intersectObjects(furniture.pickTargets(), false)
    return hits.length ? (hits[0].object.userData.uid as string) : null
  }

  function floorPoint(e: PointerEvent): Point | null {
    aim(e)
    return raycaster.ray.intersectPlane(floor, hit) ? [hit.x, hit.z] : null
  }

  // ---- measure tool ------------------------------------------------------
  const measurePts: Point[] = []
  const measureObjs: THREE.Object3D[] = []

  function clearMeasure() {
    for (const o of measureObjs) {
      sp.overlayGroup.remove(o)
      disposeTree(o)
    }
    measureObjs.length = 0
    measurePts.length = 0
    hooks.onMeasure(null)
    sp.markDirty()
  }

  /** Prefer a nearby corner (screen distance) so edge-to-edge measurements are exact; else round to 1 cm. */
  function snapMeasure(e: PointerEvent, p: Point): Point {
    const cam = sp.activeCamera()
    const r = canvas.getBoundingClientRect()
    let best: Point | null = null
    let bestDist = MEASURE_SNAP_PX
    for (const c of hooks.snapPoints()) {
      tmp.set(c[0], 0, c[1]).project(cam)
      const px = (tmp.x * 0.5 + 0.5) * r.width + r.left
      const py = (-tmp.y * 0.5 + 0.5) * r.height + r.top
      const d = Math.hypot(px - e.clientX, py - e.clientY)
      if (d < bestDist) {
        bestDist = d
        best = c
      }
    }
    return best ?? [round2(p[0]), round2(p[1])]
  }

  function addMeasurePoint(e: PointerEvent) {
    const raw = floorPoint(e)
    if (!raw) return
    if (measurePts.length >= 2) clearMeasure()
    const p = snapMeasure(e, raw)
    measurePts.push(p)

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xe8336d, depthTest: false }),
    )
    dot.position.set(p[0], 0.03, p[1])
    dot.renderOrder = 10
    sp.overlayGroup.add(dot)
    measureObjs.push(dot)

    if (measurePts.length === 2) {
      const [a, b] = measurePts
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0], 0.03, a[1]), new THREE.Vector3(b[0], 0.03, b[1])]),
        new THREE.LineBasicMaterial({ color: 0xe8336d, depthTest: false }),
      )
      line.renderOrder = 10
      const cm = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 100)
      const tag = document.createElement('div')
      tag.className = 'measure-label'
      tag.textContent = `${cm} cm`
      const label = new CSS2DObject(tag)
      label.position.set((a[0] + b[0]) / 2, 0.05, (a[1] + b[1]) / 2)
      sp.overlayGroup.add(line, label)
      measureObjs.push(line, label)
      hooks.onMeasure(cm)
    } else {
      hooks.onMeasure(null)
    }
    sp.markDirty()
  }

  // ---- wall tool ---------------------------------------------------------
  let wallStart: Point | null = null
  let draftObjs: THREE.Object3D[] = []
  let hoverWall: number | null = null

  function clearDraftPreview() {
    for (const o of draftObjs) {
      sp.overlayGroup.remove(o)
      disposeTree(o)
    }
    draftObjs = []
  }

  function clearWallDraft() {
    wallStart = null
    clearDraftPreview()
    setHoverWall(null)
    sp.markDirty()
  }

  function setHoverWall(i: number | null) {
    hoverWall = i
    sp.planObjs.highlightWall(i)
    sp.markDirty()
  }

  function pickWall(e: PointerEvent): number | null {
    aim(e)
    const hits = raycaster.intersectObjects(sp.planObjs.wallPickTargets(), false)
    return hits.length ? (hits[0].object.userData.index as number) : null
  }

  function snapWallStart(e: PointerEvent, p: Point): Point {
    const near = snapMeasure(e, p)
    // snapMeasure falls back to 1 cm rounding; walls use the 5 cm grid unless a corner was hit
    return hooks.wallSnapPoints().some((c) => c[0] === near[0] && c[1] === near[1]) ? near : [snap5(p[0]), snap5(p[1])]
  }

  /** Keeps the wall on one axis and lines its end up with nearby existing wall coordinates. */
  function snapWallEnd(start: Point, p: Point): Point {
    const horizontal = Math.abs(p[0] - start[0]) >= Math.abs(p[1] - start[1])
    const k = horizontal ? 0 : 1
    let v = snap5(p[k])
    let best = ALIGN_M
    for (const c of hooks.wallSnapPoints()) {
      const d = Math.abs(c[k] - p[k])
      if (d < best) {
        best = d
        v = c[k]
      }
    }
    return horizontal ? [v, start[1]] : [start[0], v]
  }

  const draftDotMat = () => new THREE.MeshBasicMaterial({ color: 0xe8336d, depthTest: false })

  function showDraft(end: Point | null) {
    if (!wallStart) return
    clearDraftPreview()
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), draftDotMat())
    dot.position.set(wallStart[0], 0.03, wallStart[1])
    dot.renderOrder = 10
    sp.overlayGroup.add(dot)
    draftObjs.push(dot)
    if (end) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(wallStart[0], 0.03, wallStart[1]), new THREE.Vector3(end[0], 0.03, end[1])]),
        new THREE.LineBasicMaterial({ color: 0xe8336d, depthTest: false }),
      )
      line.renderOrder = 10
      const tag = document.createElement('div')
      tag.className = 'measure-label'
      tag.textContent = `${Math.round(Math.hypot(end[0] - wallStart[0], end[1] - wallStart[1]) * 100)} cm`
      const label = new CSS2DObject(tag)
      label.position.set((wallStart[0] + end[0]) / 2, 0.05, (wallStart[1] + end[1]) / 2)
      sp.overlayGroup.add(line, label)
      draftObjs.push(line, label)
    }
    sp.markDirty()
  }

  function wallTap(e: PointerEvent) {
    if (hooks.wallTool() === 'erase') {
      const i = pickWall(e)
      if (i !== null) {
        setHoverWall(null)
        hooks.onWallErase(i)
      }
      return
    }
    const raw = floorPoint(e)
    if (!raw) return
    if (!wallStart) {
      wallStart = snapWallStart(e, raw)
      showDraft(null)
      return
    }
    const end = snapWallEnd(wallStart, raw)
    if (Math.hypot(end[0] - wallStart[0], end[1] - wallStart[1]) < MIN_WALL) {
      clearWallDraft() // tapping the last point again ends the chain
      return
    }
    hooks.onWallDraw(wallStart, end)
    wallStart = end // keep going from the new end
    showDraft(null)
  }

  function wallHover(e: PointerEvent) {
    if (hooks.wallTool() === 'erase') {
      setHoverWall(pickWall(e))
    } else if (wallStart) {
      const raw = floorPoint(e)
      if (raw) showDraft(snapWallEnd(wallStart, raw))
    }
  }

  // ---- distance guides ---------------------------------------------------
  let guideObjs: THREE.Object3D[] = []

  function clearGuides() {
    if (!guideObjs.length) return
    for (const o of guideObjs) {
      o.removeFromParent()
      disposeTree(o)
    }
    guideObjs = []
    sp.markDirty()
  }

  function showGuides(uid: string) {
    clearGuides()
    for (const g of hooks.guidesFor(uid)) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(g.from[0], 0.04, g.from[1]), new THREE.Vector3(g.to[0], 0.04, g.to[1])]),
        new THREE.LineBasicMaterial({ color: 0x2a8fe0, depthTest: false }),
      )
      line.renderOrder = 9
      const tag = document.createElement('div')
      tag.className = 'guide-label'
      tag.textContent = `${g.cm}`
      const label = new CSS2DObject(tag)
      label.position.set((g.from[0] + g.to[0]) / 2, 0.05, (g.from[1] + g.to[1]) / 2)
      sp.overlayGroup.add(line, label)
      guideObjs.push(line, label)
    }
    sp.markDirty()
  }

  // ---- corner resize handles ---------------------------------------------
  // DOM handles (CSS2D) so they stay a constant size at any zoom and take pointer events themselves.
  const handles = [0, 1, 2, 3].map((corner) => {
    const element = document.createElement('div')
    element.className = 'resize-handle'
    element.dataset.corner = String(corner)
    const obj = new CSS2DObject(element)
    obj.visible = false
    sp.overlayGroup.add(obj)
    return obj
  })

  // Rotate handle: top-centre of the selected piece, lifted above it in CSS (margin survives CSS2D's own transform).
  const rotateEl = document.createElement('div')
  rotateEl.className = 'rotate-handle'
  const rotateObj = new CSS2DObject(rotateEl)
  rotateObj.visible = false
  sp.overlayGroup.add(rotateObj)

  function syncHandles() {
    const target = hooks.resizable()
    rotateObj.visible = !!target
    if (target) rotateObj.position.set((target.rect.x0 + target.rect.x1) / 2, 0.06, target.rect.y0)
    // corner resize needs an axis-aligned footprint; a freely turned piece resizes from the W / D fields instead
    handles.forEach((h, i) => {
      h.visible = !!target && target.quarter
      if (!target) return
      const { x0, y0, x1, y1 } = target.rect
      const corners: Point[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
      h.position.set(corners[i][0], 0.06, corners[i][1])
    })
    sp.markDirty()
  }

  /** Corner point i (0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left) of the selected piece's footprint. */
  function cornerOf(i: number): Point | null {
    const t = hooks.resizable()
    if (!t) return null
    const { x0, y0, x1, y1 } = t.rect
    return ([[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as Point[])[i]
  }

  // ---- pointer handling --------------------------------------------------
  // Registered in the capture phase on the container so a drag that starts on furniture
  // can stop the event before OrbitControls (on the canvas) sees it.
  function openContext(e: PointerEvent | MouseEvent) {
    const ev = e as PointerEvent
    const uid = pickUid(ev)
    hooks.onContext(uid, e.clientX, e.clientY, floorPoint(ev))
  }

  function onDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button === 2) {
      rtap = { pointerId: e.pointerId, x: e.clientX, y: e.clientY }
      rightDownAt = performance.now()
      return
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return
    down.add(e.pointerId)

    if (drag || resize || rotating) {
      e.stopPropagation() // ignore extra fingers while dragging an item
      return
    }
    if (down.size > 1) {
      tap = null // pinch / two-finger pan belongs to the camera
      return
    }
    const rot = (e.target as Element | null)?.closest?.('.rotate-handle') ? hooks.resizable() : null
    if (rot) {
      rotating = {
        pointerId: e.pointerId,
        uid: rot.uid,
        centre: [(rot.rect.x0 + rot.rect.x1) / 2, (rot.rect.y0 + rot.rect.y1) / 2],
        x: e.clientX,
        y: e.clientY,
        moved: false,
      }
      hooks.onRotateStart(rot.uid)
      tap = null
      e.stopPropagation()
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        /* pointer already gone */
      }
      return
    }
    const handle = (e.target as Element | null)?.closest?.('.resize-handle') as HTMLElement | null
    const grabbed = handle ? hooks.resizable() : null
    const anchor = handle ? cornerOf((Number(handle.dataset.corner) + 2) % 4) : null
    if (grabbed && anchor) {
      resize = { pointerId: e.pointerId, uid: grabbed.uid, anchor, started: false }
      tap = null
      e.stopPropagation()
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        /* pointer already gone */
      }
      return
    }
    tap = { pointerId: e.pointerId, x: e.clientX, y: e.clientY }

    if (hooks.isArrange() && !hooks.isMeasuring() && !hooks.wallTool()) {
      const picked = pickUid(e)
      const uid = picked && !hooks.isLocked(picked) ? picked : null // a locked piece is selected by the tap, never dragged
      const start = uid ? hooks.itemPos(uid) : null
      const p = uid ? floorPoint(e) : null
      if (uid && start && p) {
        drag = { pointerId: e.pointerId, uid, dx: start[0] - p[0], dy: start[1] - p[1], started: false }
        hooks.onSelect(uid)
        tap = null
        e.stopPropagation()
        try {
          canvas.setPointerCapture(e.pointerId)
        } catch {
          /* pointer already gone */
        }
      }
    }
  }

  function onMove(e: PointerEvent) {
    if (rtap && rtap.pointerId === e.pointerId && Math.hypot(e.clientX - rtap.x, e.clientY - rtap.y) > TAP_SLOP_PX) rtap = null
    if (e.pointerType === 'mouse') lastCursor = floorPoint(e)
    if (tap && tap.pointerId === e.pointerId && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_SLOP_PX) tap = null

    if (rotating && rotating.pointerId === e.pointerId) {
      if (!rotating.moved && Math.hypot(e.clientX - rotating.x, e.clientY - rotating.y) <= TAP_SLOP_PX) return
      const p = floorPoint(e)
      if (!p) return
      rotating.moved = true
      const dx = p[0] - rotating.centre[0]
      const dy = p[1] - rotating.centre[1]
      if (Math.hypot(dx, dy) < 0.2) return // too close to the centre to give a direction
      hooks.onRotateTo(rotating.uid, (Math.atan2(dx, -dy) * 180) / Math.PI, e.shiftKey, e.altKey)
      return
    }

    if (resize && resize.pointerId === e.pointerId) {
      const p = floorPoint(e)
      if (!p) return
      const cx = snap5(p[0])
      const cy = snap5(p[1])
      if (!resize.started) {
        if (cx === resize.anchor[0] && cy === resize.anchor[1]) return
        resize.started = true
        hooks.onResizeStart(resize.uid)
      }
      hooks.onResize(resize.uid, resize.anchor[0], resize.anchor[1], cx, cy, !e.altKey)
      showGuides(resize.uid)
      return
    }

    if (drag && drag.pointerId === e.pointerId) {
      const p = floorPoint(e)
      if (!p) return
      const { w, d } = hooks.bounds()
      let x = clamp(snap5(p[0] + drag.dx), 0, w)
      let y = clamp(snap5(p[1] + drag.dy), 0, d)
      if (!e.altKey) [x, y] = hooks.snapDrag(drag.uid, x, y)
      const cur = hooks.itemPos(drag.uid)
      if (!cur || (cur[0] === x && cur[1] === y)) return
      if (!drag.started) {
        drag.started = true
        hooks.onDragStart()
      }
      hooks.onDrag(drag.uid, x, y)
      showGuides(drag.uid)
      return
    }

    if (hooks.wallTool()) {
      if (e.buttons === 0 || e.pointerType !== 'mouse') wallHover(e)
      canvas.style.cursor = e.buttons === 0 ? 'crosshair' : ''
      return
    }

    if (e.pointerType === 'mouse' && e.buttons === 0) {
      const over = hooks.isArrange() && !hooks.isMeasuring() && pickUid(e)
      canvas.style.cursor = hooks.isMeasuring() ? 'crosshair' : over ? 'grab' : ''
    }
  }

  function finish(e: PointerEvent, cancelled: boolean) {
    down.delete(e.pointerId)
    if (rotating && rotating.pointerId === e.pointerId) {
      if (!rotating.moved && !cancelled) hooks.onRotateTap(rotating.uid)
      rotating = null
      tap = null
      return
    }
    if (resize && resize.pointerId === e.pointerId) {
      clearGuides()
      resize = null
      tap = null
      return
    }
    if (drag && drag.pointerId === e.pointerId) {
      // pressed on a piece and released without moving it = a tap on that piece
      const tapped = !cancelled && !drag.started ? drag.uid : null
      clearGuides()
      drag = null
      tap = null
      registerTap(tapped, e)
      return
    }
    if (!tap || tap.pointerId !== e.pointerId) return
    tap = null
    if (cancelled) return
    if (hooks.wallTool()) wallTap(e)
    else if (hooks.isArrange() && hooks.isMeasuring()) addMeasurePoint(e)
    else {
      const uid = pickUid(e)
      hooks.onSelect(uid)
      registerTap(uid, e)
    }
  }

  const onLeave = () => (lastCursor = null)
  const onUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button === 2) {
      if (rtap && rtap.pointerId === e.pointerId) {
        rightHandledAt = performance.now()
        openContext(e)
      }
      rtap = null
      return
    }
    finish(e, false)
  }
  // The browser's own menu is always suppressed. A contextmenu with no right-button press just before it
  // (ctrl+click, touch long-press) opens ours directly.
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    const now = performance.now()
    if (now - rightDownAt > 800 && now - rightHandledAt > 300) openContext(e)
  }
  const onCancel = (e: PointerEvent) => finish(e, true)

  el.addEventListener('pointerdown', onDown, true)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointerleave', onLeave)
  el.addEventListener('contextmenu', onContextMenu)
  el.addEventListener('pointercancel', onCancel)

  return {
    cursor: () => lastCursor,
    syncHandles,
    clearMeasure,
    clearWallDraft,
    dispose() {
      el.removeEventListener('pointerdown', onDown, true)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('contextmenu', onContextMenu)
      el.removeEventListener('pointercancel', onCancel)
      clearMeasure()
      clearWallDraft()
      for (const h of handles) {
        h.removeFromParent()
      }
      rotateObj.removeFromParent()
      clearGuides()
    },
  }
}
