import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import type { Point } from '@/constants/houseplan/floorplan'
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
  onDragStart(): void
  onDrag(uid: string, x: number, y: number): void
  onMeasure(cm: number | null): void
  wallTool(): 'draw' | 'erase' | null
  /** Existing wall end points and outline corners, for snapping new walls. */
  wallSnapPoints(): Point[]
  onWallDraw(a: Point, b: Point): void
  onWallErase(index: number): void
}

export interface Interaction {
  clearMeasure(): void
  /** Drops an unfinished wall and any erase highlight. */
  clearWallDraft(): void
  dispose(): void
}

const TAP_SLOP_PX = 6
const MEASURE_SNAP_PX = 14
const MIN_WALL = 0.1
/** How close (m) a new wall end must be to an existing wall's coordinate to line up with it. */
const ALIGN_M = 0.08

/** Snap to the 5 cm grid. */
export const snap5 = (v: number) => Math.round(v * 20) / 20
const round2 = (v: number) => Math.round(v * 100) / 100
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

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
  let tap: { pointerId: number; x: number; y: number } | null = null
  const down = new Set<number>()

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

  // ---- pointer handling --------------------------------------------------
  // Registered in the capture phase on the container so a drag that starts on furniture
  // can stop the event before OrbitControls (on the canvas) sees it.
  function onDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    down.add(e.pointerId)

    if (drag) {
      e.stopPropagation() // ignore extra fingers while dragging an item
      return
    }
    if (down.size > 1) {
      tap = null // pinch / two-finger pan belongs to the camera
      return
    }
    tap = { pointerId: e.pointerId, x: e.clientX, y: e.clientY }

    if (hooks.isArrange() && !hooks.isMeasuring() && !hooks.wallTool()) {
      const uid = pickUid(e)
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
    if (tap && tap.pointerId === e.pointerId && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_SLOP_PX) tap = null

    if (drag && drag.pointerId === e.pointerId) {
      const p = floorPoint(e)
      if (!p) return
      const { w, d } = hooks.bounds()
      const x = clamp(snap5(p[0] + drag.dx), 0, w)
      const y = clamp(snap5(p[1] + drag.dy), 0, d)
      const cur = hooks.itemPos(drag.uid)
      if (!cur || (cur[0] === x && cur[1] === y)) return
      if (!drag.started) {
        drag.started = true
        hooks.onDragStart()
      }
      hooks.onDrag(drag.uid, x, y)
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
    if (drag && drag.pointerId === e.pointerId) {
      drag = null
      tap = null
      return
    }
    if (!tap || tap.pointerId !== e.pointerId) return
    tap = null
    if (cancelled) return
    if (hooks.wallTool()) wallTap(e)
    else if (hooks.isArrange() && hooks.isMeasuring()) addMeasurePoint(e)
    else hooks.onSelect(pickUid(e))
  }

  const onUp = (e: PointerEvent) => finish(e, false)
  const onCancel = (e: PointerEvent) => finish(e, true)

  el.addEventListener('pointerdown', onDown, true)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onCancel)

  return {
    clearMeasure,
    clearWallDraft,
    dispose() {
      el.removeEventListener('pointerdown', onDown, true)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
      clearMeasure()
      clearWallDraft()
    },
  }
}
