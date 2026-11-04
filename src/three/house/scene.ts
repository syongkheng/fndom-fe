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
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' })
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
      orthoControls.dispose()
      perspControls.dispose()
      disposeTree(scene)
      renderer.dispose()
      renderer.domElement.remove()
      labelRenderer.domElement.remove()
    },
  }
}
