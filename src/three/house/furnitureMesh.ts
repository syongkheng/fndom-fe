import * as THREE from 'three'
import { categoryColor, type PlacedItem } from '@/constants/houseplan/furniture'
import { resolveParts } from '@/constants/houseplan/furnitureModels'
import { disposeTree } from './buildPlan'
import { buildPartsModel, type PartsModel } from './furnitureParts'

interface Entry {
  group: THREE.Group
  model: PartsModel
  /** what the model was built from; a change in any of these rebuilds it */
  parts: PlacedItem['parts']
  dims: string
}

export interface FurnitureLayer {
  sync(items: PlacedItem[], selectedId: string | null, conflicts: Set<string>): void
  pickTargets(): THREE.Object3D[]
  dispose(): void
}

export function createFurnitureLayer(parent: THREE.Group, onChange: () => void): FurnitureLayer {
  const entries = new Map<string, Entry>()

  // The plan itself is unlit line art, so the lights only touch furniture.
  const ambient = new THREE.AmbientLight(0xffffff, 1.2)
  const sun = new THREE.DirectionalLight(0xffffff, 2.2)
  sun.position.set(3, 10, 6)
  parent.add(ambient, sun)

  function build(item: PlacedItem): Entry {
    const model = buildPartsModel(resolveParts(item.catalogId, item.w, item.d, item.h, item.parts), categoryColor(item.category), item.uid)
    const group = new THREE.Group()
    group.add(model.group)
    parent.add(group)
    return { group, model, parts: item.parts, dims: `${item.w}|${item.d}|${item.h}` }
  }

  function remove(uid: string, e: Entry) {
    parent.remove(e.group)
    disposeTree(e.group)
    entries.delete(uid)
  }

  return {
    sync(items, selectedId, conflicts) {
      const live = new Set(items.map((i) => i.uid))
      for (const [uid, e] of entries) if (!live.has(uid)) remove(uid, e)

      for (const item of items) {
        let e = entries.get(item.uid)
        if (e && (e.parts !== item.parts || e.dims !== `${item.w}|${item.d}|${item.h}`)) {
          remove(item.uid, e)
          e = undefined
        }
        e ??= build(item)
        entries.set(item.uid, e)
        e.group.position.set(item.x, 0, item.y)
        e.group.rotation.y = (-item.rot * Math.PI) / 180 // clockwise on the plan
        e.model.setState(conflicts.has(item.uid) ? 'conflict' : item.uid === selectedId ? 'selected' : 'normal')
      }
      onChange()
    },
    pickTargets() {
      return [...entries.values()].flatMap((e) => e.model.meshes)
    },
    dispose() {
      for (const [uid, e] of entries) remove(uid, e)
      parent.remove(ambient, sun)
      sun.dispose()
    },
  }
}
