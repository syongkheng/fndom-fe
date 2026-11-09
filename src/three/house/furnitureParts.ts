import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { FurniturePart } from '@/constants/houseplan/furniture'

export const SELECTED = 0xffd23f
export const CONFLICT = 0xff3b3b
export const WARNING = 0xffa21f

export type ModelState = 'normal' | 'selected' | 'conflict' | 'warning'

export interface PartsModel {
  group: THREE.Group
  /** one mesh per part, in the same order as the parts; userData.partIndex / userData.uid are set */
  meshes: THREE.Mesh[]
  setState(state: ModelState): void
  /** brighten one part (the builder uses this to show which part is being edited); null clears it */
  highlight(partIndex: number | null): void
}

/** A half-round "D" prism: flat side toward +z, bulging toward -z, standing on y = 0 and centred on its box. */
function halfGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.absellipse(0, 0, 0.5, 1, 0, Math.PI, false, 0)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 32 })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -0.5, 0.5)
  return geo
}

/** Geometry centred on the part's own bounding box. */
export function createPartGeometry(p: FurniturePart): THREE.BufferGeometry {
  switch (p.shape) {
    case 'box': {
      const radius = p.round * (Math.min(p.sx, p.sy, p.sz) / 2)
      return radius > 0.002 ? new RoundedBoxGeometry(p.sx, p.sy, p.sz, 4, radius) : new THREE.BoxGeometry(p.sx, p.sy, p.sz)
    }
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5 * p.taper, 0.5, 1, 40).scale(p.sx, p.sy, p.sz)
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 40, 22).scale(p.sx, p.sy, p.sz)
    case 'roll':
      // a cylinder lying along x; rotate the part to point it along z
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 40).rotateZ(Math.PI / 2).scale(p.sx, p.sy, p.sz)
    case 'half':
      return halfGeometry().scale(p.sx, p.sy, p.sz)
  }
}

export function buildPartsModel(parts: FurniturePart[], fallbackColor: number, uid?: string): PartsModel {
  const group = new THREE.Group()
  const meshes: THREE.Mesh[] = []
  const mats: THREE.MeshStandardMaterial[] = []
  const edgeMats: { mat: THREE.LineBasicMaterial; base: THREE.Color }[] = []

  parts.forEach((p, i) => {
    const geo = createPartGeometry(p)
    const color = new THREE.Color(p.color ?? fallbackColor)
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData.partIndex = i
    if (uid) mesh.userData.uid = uid

    const edgeBase = color.clone().multiplyScalar(0.5)
    const edgeMat = new THREE.LineBasicMaterial({ color: edgeBase })
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat))

    mesh.position.set(p.px, p.py + p.sy / 2, p.pz)
    mesh.rotation.y = (-p.ry * Math.PI) / 180 // clockwise on the plan
    group.add(mesh)
    meshes.push(mesh)
    mats.push(mat)
    edgeMats.push({ mat: edgeMat, base: edgeBase })
  })

  let state: ModelState = 'normal'
  let lit: number | null = null

  function paint() {
    const tint = state === 'selected' ? SELECTED : state === 'conflict' ? CONFLICT : state === 'warning' ? WARNING : null
    mats.forEach((m, i) => {
      if (tint !== null) {
        m.emissive.set(tint)
        m.emissiveIntensity = 0.35
      } else if (i === lit) {
        m.emissive.set(SELECTED)
        m.emissiveIntensity = 0.3
      } else {
        m.emissive.set(0x000000)
        m.emissiveIntensity = 1
      }
    })
    edgeMats.forEach((e) => e.mat.color.set(tint ?? e.base))
  }

  return {
    group,
    meshes,
    setState(s) {
      state = s
      paint()
    },
    highlight(i) {
      lit = i
      paint()
    },
  }
}
