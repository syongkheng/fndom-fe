import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import type { FloorPlan, Wall } from '@/constants/houseplan/floorplan'

export interface PlanObjects {
  group: THREE.Group
  setTheme(dark: boolean): void
  /** Rebuilds the wall boxes from an edited list. */
  setWalls(walls: Wall[]): void
  /** Meshes to raycast against; userData.index is the wall's position in the list. */
  wallPickTargets(): THREE.Object3D[]
  /** Tints one wall as the erase target (null clears). */
  highlightWall(index: number | null): void
}

/** Dispose every geometry and material under an object. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    m.geometry?.dispose()
    const mat = m.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
    else mat?.dispose()
  })
}

export function buildPlan(plan: FloorPlan): PlanObjects {
  const group = new THREE.Group()
  const t = plan.wallThickness

  const wallEdgeMat = new THREE.LineBasicMaterial({ color: 0x223044 })
  const wallFillMat = new THREE.MeshBasicMaterial({ color: 0x6f8aa8, transparent: true, opacity: 0.08, depthWrite: false })
  const dashedMat = new THREE.LineDashedMaterial({ color: 0x607080, dashSize: 0.15, gapSize: 0.1 })
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x8aa4c0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })
  const outlineMat = new THREE.LineBasicMaterial({ color: 0x607080, transparent: true, opacity: 0.6 })

  // 1 m drafting grid under the plan (vertex colours are white, material colour tints it per theme)
  const gridSize = Math.ceil(Math.max(plan.width, plan.depth)) + 6
  const grid = new THREE.GridHelper(gridSize, gridSize, 0xffffff, 0xffffff)
  const gridMat = grid.material as THREE.LineBasicMaterial
  gridMat.transparent = true
  gridMat.opacity = 0.22
  grid.position.set(plan.width / 2, -0.01, plan.depth / 2)
  group.add(grid)

  // floor slab: shape lives in XY, rotate so plan y becomes world Z
  const shape = new THREE.Shape(plan.outline.map(([x, y]) => new THREE.Vector2(x, y)))
  const floorGeo = new THREE.ShapeGeometry(shape)
  floorGeo.rotateX(Math.PI / 2)
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.position.y = -0.002
  group.add(floor)

  const loopPts = plan.outline.map(([x, y]) => new THREE.Vector3(x, 0, y))
  group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(loopPts), outlineMat))

  // walls: boxes lengthened by one thickness so corners and T-joins close up
  const wallGroup = new THREE.Group()
  group.add(wallGroup)
  const wallHotMat = new THREE.MeshBasicMaterial({ color: 0xe8336d, transparent: true, opacity: 0.55, depthWrite: false })
  let pickMeshes: THREE.Mesh[] = []
  let hot: THREE.Mesh | null = null

  function setWalls(walls: Wall[]) {
    hot = null
    for (const child of [...wallGroup.children]) {
      wallGroup.remove(child)
      // geometries are per wall; the materials are shared, so only free the geometry
      child.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
    }
    pickMeshes = []
    walls.forEach((w, index) => {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) + t
      const horizontal = Math.abs(w.x2 - w.x1) >= Math.abs(w.y2 - w.y1)
      const geo = new THREE.BoxGeometry(horizontal ? len : t, w.zTop - w.zBottom, horizontal ? t : len)
      const box = new THREE.Group()
      const fill = new THREE.Mesh(geo, wallFillMat)
      fill.userData.index = index
      pickMeshes.push(fill)
      box.add(fill)
      box.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), wallEdgeMat))
      box.position.set((w.x1 + w.x2) / 2, (w.zBottom + w.zTop) / 2, (w.y1 + w.y2) / 2)
      wallGroup.add(box)
    })
  }

  function highlightWall(index: number | null) {
    if (hot) hot.material = wallFillMat
    hot = index === null ? null : (pickMeshes[index] ?? null)
    if (hot) hot.material = wallHotMat
  }

  setWalls(plan.walls)

  // dashed open boundaries
  const dashPts: THREE.Vector3[] = []
  for (const l of plan.dashed) {
    dashPts.push(new THREE.Vector3(l.from[0], 0.005, l.from[1]), new THREE.Vector3(l.to[0], 0.005, l.to[1]))
  }
  const dashed = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dashPts), dashedMat)
  dashed.computeLineDistances()
  group.add(dashed)

  // numbered room markers (HTML, never intercept pointer input)
  for (const r of plan.rooms) {
    const el = document.createElement('div')
    el.className = 'room-marker'
    el.textContent = String(r.id)
    el.style.pointerEvents = 'none'
    const label = new CSS2DObject(el)
    label.position.set(r.pos[0], 0.02, r.pos[1])
    group.add(label)
  }

  function setTheme(dark: boolean) {
    // warm palette — mirrors --color-* in assets/base.css
    wallEdgeMat.color.set(dark ? 0xfbefe3 : 0x2b1b14)
    wallFillMat.color.set(dark ? 0xff6b4a : 0xe8452c)
    dashedMat.color.set(dark ? 0xc9b3a2 : 0x6e5648)
    floorMat.color.set(dark ? 0x4a3c33 : 0xebd8c2)
    outlineMat.color.set(dark ? 0xc9b3a2 : 0x6e5648)
    gridMat.color.set(dark ? 0xff6b4a : 0xe8452c)
  }

  return { group, setTheme, setWalls, wallPickTargets: () => pickMeshes, highlightWall }
}
