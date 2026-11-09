import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import type { FloorPlan } from '@/constants/houseplan/floorplan'
import type { HouseMode, HousePreset } from '@/interfaces/House.model'
import { buildPlan, disposeTree, type PlanObjects } from './buildPlan'

export interface PlannerScene {
  container: HTMLElement
  renderer: THREE.WebGLRenderer
  planObjs: PlanObjects
  furnitureGroup: THREE.Group
  overlayGroup: THREE.Group
  activeCamera(): THREE.Camera
  setMode(m: HouseMode): void
  applyPreset(p: HousePreset): void
  /** Frames the whole plan again (top-down view, or the 3D preset). */
  fitPlan(): void
  /** Zooms in on a footprint (plan metres). */
  zoomToRect(r: { x0: number; y0: number; x1: number; y1: number }): void
  setTheme(dark: boolean): void
  markDirty(): void
  snapshot(): string
  dispose(): void
}

export function createPlannerScene(container: HTMLElement, plan: FloorPlan): PlannerScene {
  const cx = plan.width / 2
  const cz = plan.depth / 2
  const scene = new THREE.Scene()

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.domElement.style.display = 'block'
  container.appendChild(renderer.domElement)

  const labelRenderer = new CSS2DRenderer()
  // own stacking context: the renderer sets each label's z-index from its depth, which must not outrank the overlay panels
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none', zIndex: '0' })
  container.appendChild(labelRenderer.domElement)

  const planObjs = buildPlan(plan)
  const furnitureGroup = new THREE.Group()
  const overlayGroup = new THREE.Group()
  scene.add(planObjs.group, furnitureGroup, overlayGroup)

  // Arrange mode: orthographic, straight down, plan x to the right, plan y down the screen
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  ortho.up.set(0, 0, -1)
  ortho.position.set(cx, 40, cz)
  ortho.lookAt(cx, 0, cz)

  const persp = new THREE.PerspectiveCamera(50, 1, 0.1, 300)
  persp.position.set(cx, 14, cz + 15)

  const orthoControls = new OrbitControls(ortho, renderer.domElement)
  orthoControls.target.set(cx, 0, cz)
  orthoControls.enableRotate = false
  orthoControls.enableDamping = true
  orthoControls.zoomToCursor = true
  orthoControls.minZoom = 0.8
  orthoControls.maxZoom = 8
  orthoControls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
  orthoControls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }
  orthoControls.update()

  const perspControls = new OrbitControls(persp, renderer.domElement)
  perspControls.enableDamping = true
  perspControls.maxPolarAngle = Math.PI / 2 - 0.03 // never below the floor
  perspControls.screenSpacePanning = false
  perspControls.minDistance = 0.5
  perspControls.maxDistance = 120
  // One finger turns the view (like a mouse drag); two fingers pan (like a right-drag) or pinch to zoom, never both at once.
  perspControls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
  const lockTwoFingers = twoFingerLock(renderer.domElement, [orthoControls, perspControls])

  let mode: HouseMode = 'arrange'
  let dirty = true
  let raf = 0
  const markDirty = () => (dirty = true)
  orthoControls.addEventListener('change', markDirty)
  perspControls.addEventListener('change', markDirty)

  const activeCamera = (): THREE.Camera => (mode === 'arrange' ? ortho : persp)

  function fitOrtho() {
    ortho.zoom = 1
    ortho.position.set(cx, 40, cz)
    orthoControls.target.set(cx, 0, cz)
    ortho.lookAt(cx, 0, cz)
    ortho.updateProjectionMatrix()
    orthoControls.update()
    markDirty()
  }

  function fitDistance(): number {
    const t = Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2)
    const needH = (plan.depth / 2 + 0.8) / t
    const needW = (plan.width / 2 + 0.8) / (t * persp.aspect)
    return Math.max(needH, needW)
  }

  function applyPreset(p: HousePreset) {
    const target = new THREE.Vector3(cx, 0, cz)
    const pos = new THREE.Vector3()
    if (p === '3d') {
      pos.copy(target).addScaledVector(new THREE.Vector3(0, 0.68, 0.73).normalize(), fitDistance() * 1.15)
    } else if (p === 'top') {
      pos.set(cx, fitDistance() * 1.02, cz + 0.001)
    } else {
      pos.set(plan.eye.pos[0], 1.6, plan.eye.pos[1])
      target.set(plan.eye.target[0], 1.2, plan.eye.target[1])
    }
    persp.position.copy(pos)
    perspControls.target.copy(target)
    persp.lookAt(target)
    perspControls.update()
    markDirty()
  }

  function setMode(m: HouseMode) {
    mode = m
    orthoControls.enabled = m === 'arrange'
    perspControls.enabled = m === '3d'
    if (m === 'arrange') fitOrtho()
    markDirty()
  }

  function zoomToRect(r: { x0: number; y0: number; x1: number; y1: number }) {
    const mx = (r.x0 + r.x1) / 2
    const mz = (r.y0 + r.y1) / 2
    const w = r.x1 - r.x0 + 1.6
    const d = r.y1 - r.y0 + 1.6
    if (mode === 'arrange') {
      const vw = ortho.right - ortho.left
      const vh = ortho.top - ortho.bottom
      ortho.zoom = THREE.MathUtils.clamp(Math.min(vw / w, vh / d), orthoControls.minZoom, orthoControls.maxZoom)
      ortho.position.set(mx, 40, mz)
      orthoControls.target.set(mx, 0, mz)
      ortho.lookAt(mx, 0, mz)
      ortho.updateProjectionMatrix()
      orthoControls.update()
    } else {
      // keep the viewing direction, move in on the piece
      const target = new THREE.Vector3(mx, 0.5, mz)
      const dir = persp.position.clone().sub(perspControls.target).normalize()
      persp.position.copy(target).addScaledVector(dir, Math.max(2.5, Math.max(w, d) * 1.6))
      perspControls.target.copy(target)
      persp.lookAt(target)
      perspControls.update()
    }
    markDirty()
  }

  function fitPlan() {
    if (mode === 'arrange') fitOrtho()
    else applyPreset('3d')
  }

  function resize() {
    const w = Math.max(1, container.clientWidth)
    const h = Math.max(1, container.clientHeight)
    const aspect = w / h
    renderer.setSize(w, h)
    labelRenderer.setSize(w, h)
    persp.aspect = aspect
    persp.updateProjectionMatrix()
    const halfW = Math.max((plan.width + 1.2) / 2, ((plan.depth + 1.2) / 2) * aspect)
    ortho.left = -halfW
    ortho.right = halfW
    ortho.top = halfW / aspect
    ortho.bottom = -halfW / aspect
    ortho.updateProjectionMatrix()
    markDirty()
  }

  function draw() {
    const cam = activeCamera()
    renderer.render(scene, cam)
    labelRenderer.render(scene, cam)
  }

  function frame() {
    raf = requestAnimationFrame(frame)
    const changed = (mode === 'arrange' ? orthoControls : perspControls).update()
    if (changed || dirty) {
      dirty = false
      draw()
    }
  }

  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()
  setMode('arrange')
  perspControls.enabled = false
  applyPreset('3d')
  raf = requestAnimationFrame(frame)

  return {
    container,
    renderer,
    planObjs,
    furnitureGroup,
    overlayGroup,
    activeCamera,
    setMode,
    applyPreset,
    fitPlan,
    zoomToRect,
    markDirty,
    setTheme(dark) {
      scene.background = new THREE.Color(dark ? 0x17120f : 0xfff7ec)
      planObjs.setTheme(dark)
      markDirty()
    },
    snapshot() {
      draw()
      return renderer.domElement.toDataURL('image/png')
    },
    dispose() {
      cancelAnimationFrame(raf)
      observer.disconnect()
      lockTwoFingers()
      orthoControls.dispose()
      perspControls.dispose()
      disposeTree(scene)
      renderer.dispose()
      renderer.domElement.remove()
      labelRenderer.domElement.remove()
    },
  }
}

/**
 * Two-finger gestures in OrbitControls pan and pinch-zoom at the same time, which feels twitchy on a phone. This locks each
 * gesture to whichever the fingers do more of (centre moving = pan, spread changing = zoom). Returns a cleanup function.
 */
function twoFingerLock(el: HTMLElement, controls: { enablePan: boolean; enableZoom: boolean }[]): () => void {
  const touches = new Map<number, { x: number; y: number }>()
  const LOCK_PX = 8
  let start: { dist: number; mx: number; my: number } | null = null
  let locked = false

  const metrics = () => {
    const [a, b] = [...touches.values()]
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
  }
  const release = () => {
    start = null
    locked = false
    controls.forEach((c) => {
      c.enablePan = true
      c.enableZoom = true
    })
  }
  const down = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (touches.size === 2) {
      release()
      start = metrics()
    } else release()
  }
  const move = (e: PointerEvent) => {
    const t = touches.get(e.pointerId)
    if (!t) return
    t.x = e.clientX
    t.y = e.clientY
    if (!start || locked || touches.size !== 2) return
    const now = metrics()
    const spread = Math.abs(now.dist - start.dist)
    const drift = Math.hypot(now.mx - start.mx, now.my - start.my)
    if (Math.max(spread, drift) < LOCK_PX) return
    locked = true
    const pinch = spread > drift
    controls.forEach((c) => {
      c.enableZoom = pinch
      c.enablePan = !pinch
    })
  }
  const up = (e: PointerEvent) => {
    if (!touches.delete(e.pointerId)) return
    release()
  }

  el.addEventListener('pointerdown', down, true)
  el.addEventListener('pointermove', move, true)
  el.addEventListener('pointerup', up, true)
  el.addEventListener('pointercancel', up, true)
  return () => {
    el.removeEventListener('pointerdown', down, true)
    el.removeEventListener('pointermove', move, true)
    el.removeEventListener('pointerup', up, true)
    el.removeEventListener('pointercancel', up, true)
  }
}
